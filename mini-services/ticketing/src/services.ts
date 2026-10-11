import { db } from './db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type TicketStatus =
  | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_CUSTOMER'
  | 'RESOLVED' | 'CLOSED' | 'REOPENED'

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type Channel = 'WEB' | 'PHONE' | 'WALK_IN' | 'WHATSAPP' | 'OTHER'
export type ConfirmationMethod = 'APP' | 'PHONE_OTP' | 'PHONE_MANUAL' | 'AUTO' | 'ADMIN_OVERRIDE'
export type StaffRole = 'AGENT' | 'TECHNICIAN' | 'ADMIN'

export interface Actor {
  type: 'CUSTOMER' | 'STAFF' | 'SYSTEM'
  staffId?: string
  customerId?: string
  name: string
}

/* ------------------------------------------------------------------ */
/*  Transition table (from spec §6)                                   */
/* ------------------------------------------------------------------ */

const TRANSITIONS: Record<string, TicketStatus[]> = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'],
  ASSIGNED: ['IN_PROGRESS', 'RESOLVED', 'OPEN'],
  IN_PROGRESS: ['WAITING_CUSTOMER', 'RESOLVED', 'ASSIGNED'],
  WAITING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  REOPENED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: ['REOPENED'],
}

export function isValidTransition(from: string, to: TicketStatus): boolean {
  const allowed = TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

/* ------------------------------------------------------------------ */
/*  Ticket number generator                                           */
/* ------------------------------------------------------------------ */

export async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await db.ticket.count()
  const seq = String(count + 1).padStart(6, '0')
  return `TKT-${year}-${seq}`
}

/* ------------------------------------------------------------------ */
/*  Audit log helper                                                  */
/* ------------------------------------------------------------------ */

async function audit(
  action: string,
  objectType: string,
  objectId: string,
  actor: Actor,
  ip: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
) {
  await db.auditLog.create({
    data: {
      actor: actor.name,
      action,
      objectType,
      objectId,
      before: JSON.stringify(before || {}),
      after: JSON.stringify(after || {}),
      ip,
      actorStaffId: actor.staffId,
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Timeline event helper                                             */
/* ------------------------------------------------------------------ */

async function addEvent(
  ticketId: string,
  eventType: string,
  actor: Actor,
  fromStatus: string | null,
  toStatus: string | null,
  note = '',
  isPublic = true,
) {
  await db.ticketEvent.create({
    data: {
      ticketId,
      eventType,
      actorType: actor.type,
      actorStaffId: actor.staffId,
      fromStatus,
      toStatus,
      note,
      isPublic,
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Service functions (single place for business rules)              */
/* ------------------------------------------------------------------ */

export async function createTicket(opts: {
  customerId: string
  categoryId: string
  subject: string
  description: string
  actor: Actor
  channel?: Channel
  priority?: Priority
  assignedToId?: string
}): Promise<{ ticket: any; error?: string }> {
  const { customerId, categoryId, subject, description, actor } = opts
  if (!subject.trim()) return { ticket: null, error: 'Subject is required' }

  const number = await generateTicketNumber()
  const ticket = await db.ticket.create({
    data: {
      number,
      customerId,
      categoryId,
      subject: subject.trim(),
      description: description.trim(),
      status: opts.assignedToId ? 'ASSIGNED' : 'OPEN',
      priority: opts.priority || 'NORMAL',
      channel: opts.channel || 'WEB',
      createdByType: actor.type === 'STAFF' ? 'STAFF' : 'CUSTOMER',
      createdById: actor.staffId,
      assignedToId: opts.assignedToId || null,
    },
  })

  await addEvent(ticket.id, 'CREATED', actor, null, ticket.status, `Ticket ${number} created`, true)
  if (opts.assignedToId) {
    await addEvent(ticket.id, 'ASSIGNED', actor, 'OPEN', 'ASSIGNED', 'Ticket assigned', true)
  }
  await audit('TICKET_CREATED', 'Ticket', ticket.id, actor, '', {}, { number })

  return { ticket }
}

export async function assignTicket(ticketId: string, staffId: string, actor: Actor): Promise<{ error?: string }> {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }

  const newStatus: TicketStatus = ticket.status === 'OPEN' ? 'ASSIGNED' : ticket.status as TicketStatus
  const updated = await db.ticket.update({
    where: { id: ticketId },
    data: { assignedToId: staffId, status: newStatus, updatedAt: new Date() },
  })

  await addEvent(ticketId, 'ASSIGNED', actor, ticket.status, updated.status, 'Ticket assigned', true)
  await audit('TICKET_ASSIGNED', 'Ticket', ticketId, actor, '', { assignedToId: ticket.assignedToId }, { assignedToId: staffId })

  return {}
}

export async function changeStatus(
  ticketId: string,
  toStatus: TicketStatus,
  actor: Actor,
  note = '',
): Promise<{ error?: string }> {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }

  const fromStatus = ticket.status as TicketStatus
  if (fromStatus === toStatus) return {} // no-op

  if (!isValidTransition(fromStatus, toStatus)) {
    return { error: `Invalid transition: ${fromStatus} → ${toStatus}` }
  }

  const updateData: any = { status: toStatus, updatedAt: new Date() }
  if (toStatus === 'IN_PROGRESS' && !ticket.firstResponseAt) {
    updateData.firstResponseAt = new Date()
  }

  await db.ticket.update({ where: { id: ticketId }, data: updateData })
  await addEvent(ticketId, 'STATUS_CHANGED', actor, fromStatus, toStatus, note, true)
  await audit('STATUS_CHANGED', 'Ticket', ticketId, actor, '', { status: fromStatus }, { status: toStatus })

  return {}
}

export async function addComment(
  ticketId: string,
  actor: Actor,
  body: string,
  isInternal = false,
): Promise<{ error?: string }> {
  if (!body.trim()) return { error: 'Comment body is required' }

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }

  const comment = await db.ticketComment.create({
    data: {
      ticketId,
      authorType: actor.type,
      authorStaffId: actor.staffId,
      body: body.trim(),
      isInternal,
    },
  })

  // If customer replies and ticket is WAITING_CUSTOMER, auto-move to IN_PROGRESS
  if (actor.type === 'CUSTOMER' && ticket.status === 'WAITING_CUSTOMER') {
    await changeStatus(ticketId, 'IN_PROGRESS', { type: 'SYSTEM', name: 'System' }, 'Customer replied')
  }

  await addEvent(ticketId, 'COMMENT', actor, null, null, isInternal ? 'Internal note added' : 'Comment added', !isInternal)

  return {}
}

export async function markResolved(
  ticketId: string,
  actor: Actor,
  resolutionNote: string,
): Promise<{ error?: string }> {
  if (!resolutionNote.trim()) return { error: 'Resolution note is required' }

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }

  const result = await changeStatus(ticketId, 'RESOLVED', actor, resolutionNote)
  if (result.error) return result

  const newCycle = ticket.resolutionCycle + 1
  await db.ticket.update({
    where: { id: ticketId },
    data: { resolutionNote: resolutionNote.trim(), resolvedAt: new Date(), resolutionCycle: newCycle },
  })

  await addEvent(ticketId, 'CONFIRMED', actor, null, null, `Marked resolved (cycle ${newCycle}). Awaiting customer confirmation.`, true)
  return {}
}

export async function confirmByCustomer(ticketId: string, customer: Actor): Promise<{ error?: string }> {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }
  if (ticket.status !== 'RESOLVED') return { error: 'Ticket is not in RESOLVED state' }

  await db.ticketConfirmation.create({
    data: {
      ticketId,
      resolutionCycle: ticket.resolutionCycle,
      method: 'APP',
      outcome: 'CONFIRMED',
      note: 'Customer confirmed via app',
    },
  })

  await addEvent(ticketId, 'CONFIRMED', customer, 'RESOLVED', 'RESOLVED', 'Customer confirmed problem is fixed', true)
  await audit('TICKET_CONFIRMED', 'Ticket', ticketId, customer, '', {}, { method: 'APP' })

  return {}
}

export async function rejectResolution(ticketId: string, customer: Actor, note: string): Promise<{ error?: string }> {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }
  if (ticket.status !== 'RESOLVED') return { error: 'Ticket is not in RESOLVED state' }

  await db.ticketConfirmation.create({
    data: {
      ticketId,
      resolutionCycle: ticket.resolutionCycle,
      method: 'APP',
      outcome: 'REJECTED',
      note: note || 'Customer says still not fixed',
    },
  })

  const result = await changeStatus(ticketId, 'REOPENED', customer, note || 'Customer rejected resolution')
  if (result.error) return result

  await db.ticket.update({
    where: { id: ticketId },
    data: { reopenCount: { increment: 1 } },
  })

  await addEvent(ticketId, 'REOPENED', customer, 'RESOLVED', 'REOPENED', 'Customer says still not fixed', true)
  return {}
}

export async function confirmByPhoneManual(ticketId: string, staff: Actor, note: string): Promise<{ error?: string }> {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }
  if (ticket.status !== 'RESOLVED') return { error: 'Ticket is not in RESOLVED state' }
  if (!note.trim()) return { error: 'A note is required for phone manual confirmation' }

  await db.ticketConfirmation.create({
    data: {
      ticketId,
      resolutionCycle: ticket.resolutionCycle,
      method: 'PHONE_MANUAL',
      outcome: 'CONFIRMED',
      recordedByStaffId: staff.staffId,
      note: note.trim(),
    },
  })

  await addEvent(ticketId, 'CONFIRMED', staff, 'RESOLVED', 'RESOLVED', `Confirmed by phone (recorded by ${staff.name})`, true)
  await audit('TICKET_CONFIRMED', 'Ticket', ticketId, staff, '', {}, { method: 'PHONE_MANUAL' })

  return {}
}

export async function closeTicket(ticketId: string, actor: Actor): Promise<{ error?: string }> {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }
  if (ticket.status !== 'RESOLVED') return { error: 'Ticket must be RESOLVED before closing' }

  // Check for a valid CONFIRMED confirmation for current resolution cycle
  const confirmation = await db.ticketConfirmation.findFirst({
    where: {
      ticketId,
      resolutionCycle: ticket.resolutionCycle,
      outcome: 'CONFIRMED',
    },
  })

  if (!confirmation) {
    return { error: 'Cannot close: no valid customer confirmation for the current resolution. Use admin override if necessary.' }
  }

  const result = await changeStatus(ticketId, 'CLOSED', actor, `Closed (confirmation: ${confirmation.method})`)
  if (result.error) return result

  await db.ticket.update({
    where: { id: ticketId },
    data: { closedAt: new Date() },
  })

  await addEvent(ticketId, 'CLOSED', actor, 'RESOLVED', 'CLOSED', `Ticket closed (method: ${confirmation.method})`, true)
  await audit('TICKET_CLOSED', 'Ticket', ticketId, actor, '', {}, { confirmationMethod: confirmation.method })

  return {}
}

export async function adminOverrideClose(ticketId: string, admin: Actor, reason: string): Promise<{ error?: string }> {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }
  if (!reason.trim()) return { error: 'A reason is required for admin override' }

  // Record the override confirmation
  await db.ticketConfirmation.create({
    data: {
      ticketId,
      resolutionCycle: ticket.resolutionCycle,
      method: 'ADMIN_OVERRIDE',
      outcome: 'CONFIRMED',
      recordedByStaffId: admin.staffId,
      note: `ADMIN OVERRIDE: ${reason.trim()}`,
    },
  })

  // Force close regardless of status
  await db.ticket.update({
    where: { id: ticketId },
    data: { status: 'CLOSED', closedAt: new Date(), updatedAt: new Date() },
  })

  await addEvent(ticketId, 'OVERRIDE', admin, ticket.status, 'CLOSED', `ADMIN OVERRIDE CLOSE: ${reason}`, true)
  await audit('ADMIN_OVERRIDE_CLOSE', 'Ticket', ticketId, admin, '', { status: ticket.status }, { status: 'CLOSED', reason })

  return {}
}

export async function reopenTicket(ticketId: string, actor: Actor, reason: string): Promise<{ error?: string }> {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }
  if (ticket.status !== 'CLOSED') return { error: 'Only CLOSED tickets can be reopened' }
  if (!reason.trim()) return { error: 'A reason is required to reopen' }

  const reopenWindowDays = 7
  if (ticket.closedAt) {
    const daysSinceClosed = (Date.now() - ticket.closedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceClosed > reopenWindowDays && actor.type !== 'STAFF') {
      return { error: `Reopen window (${reopenWindowDays} days) has expired. Contact support.` }
    }
  }

  const result = await changeStatus(ticketId, 'REOPENED', actor, reason)
  if (result.error) return result

  await db.ticket.update({
    where: { id: ticketId },
    data: { reopenCount: { increment: 1 }, closedAt: null },
  })

  await addEvent(ticketId, 'REOPENED', actor, 'CLOSED', 'REOPENED', reason, true)
  return {}
}

/* ------------------------------------------------------------------ */
/*  OTP                                                               */
/* ------------------------------------------------------------------ */

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function createOtpChallenge(
  purpose: 'CUSTOMER_LOGIN' | 'TICKET_CONFIRM',
  customerId: string,
  ip: string,
  ticketId?: string,
): Promise<{ code: string; error?: string }> {
  // Rate limit: max 5 OTPs per customer per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentCount = await db.otpChallenge.count({
    where: { customerId, createdAt: { gt: oneHourAgo } },
  })
  if (recentCount >= 5) {
    return { code: '', error: 'Too many OTP requests. Please try again later.' }
  }

  const code = generateOtp()
  const codeHash = await bcrypt.hash(code, 10)

  await db.otpChallenge.create({
    data: {
      purpose,
      customerId,
      ticketId,
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      ip,
    },
  })

  return { code }
}

export async function verifyOtp(
  purpose: 'CUSTOMER_LOGIN' | 'TICKET_CONFIRM',
  customerId: string,
  code: string,
): Promise<{ valid: boolean; error?: string }> {
  const challenge = await db.otpChallenge.findFirst({
    where: {
      purpose,
      customerId,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!challenge) return { valid: false, error: 'No valid OTP found. Please request a new one.' }
  if (challenge.attempts >= 5) return { valid: false, error: 'Too many attempts. Please request a new OTP.' }

  // Increment attempts
  await db.otpChallenge.update({
    where: { id: challenge.id },
    data: { attempts: { increment: 1 } },
  })

  const match = await bcrypt.compare(code, challenge.codeHash)
  if (!match) return { valid: false, error: 'Invalid OTP code.' }

  // Consume
  await db.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  })

  return { valid: true }
}
