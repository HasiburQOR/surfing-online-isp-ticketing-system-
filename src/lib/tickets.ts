import { db } from '@/lib/db'
import {
  CUSTOMER_REOPEN_WINDOW_DAYS,
  STATUS_LABELS,
  allowedTransitions,
  type Channel,
  type Priority,
  type TicketStatus,
} from '@/lib/ticket-constants'

/* ------------------------------------------------------------------ */
/*  Types & constants                                                 */
/* ------------------------------------------------------------------ */

export {
  STATUSES, PRIORITIES, CHANNELS, STATUS_LABELS, CUSTOMER_REOPEN_WINDOW_DAYS, allowedTransitions,
} from '@/lib/ticket-constants'
export type { TicketStatus, Priority, Channel } from '@/lib/ticket-constants'

export interface Actor {
  type: 'CUSTOMER' | 'ADMIN' | 'SYSTEM'
  name: string
}

type Result = { error?: string }

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

async function addEvent(
  ticketId: string,
  eventType: string,
  actor: Actor,
  fromStatus: string | null,
  toStatus: string | null,
  note = '',
) {
  await db.ticketEvent.create({
    data: { ticketId, eventType, actorType: actor.type, actorName: actor.name, fromStatus, toStatus, note },
  })
}

/* ------------------------------------------------------------------ */
/*  Commands                                                          */
/* ------------------------------------------------------------------ */

export async function createTicket(opts: {
  customerId: string
  categoryId: string
  subject: string
  description: string
  actor: Actor
  priority?: Priority
  channel?: Channel
}): Promise<{ ticket?: { id: string; number: string }; error?: string }> {
  const subject = opts.subject.trim()
  if (!subject) return { error: 'Subject is required' }
  if (subject.length > 200) return { error: 'Subject is too long (max 200 characters)' }
  if (opts.description.length > 5000) return { error: 'Description is too long (max 5000 characters)' }

  const category = await db.ticketCategory.findUnique({ where: { id: opts.categoryId } })
  if (!category || !category.isActive) return { error: 'Please choose a valid category' }

  const customer = await db.customer.findUnique({ where: { id: opts.customerId } })
  if (!customer) return { error: 'Customer not found' }

  const year = new Date().getFullYear()
  const base = await db.ticket.count()
  // The count-based number can collide if two tickets are created at once; retry with the next number.
  for (let attempt = 0; attempt < 8; attempt++) {
    const number = `TKT-${year}-${String(base + 1 + attempt).padStart(6, '0')}`
    try {
      const ticket = await db.ticket.create({
        data: {
          number,
          customerId: opts.customerId,
          categoryId: opts.categoryId,
          subject,
          description: opts.description.trim(),
          priority: opts.priority ?? 'NORMAL',
          channel: opts.channel ?? 'WEB',
          createdByType: opts.actor.type === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
        },
        select: { id: true, number: true },
      })
      await addEvent(ticket.id, 'CREATED', opts.actor, null, 'OPEN', `Ticket ${number} created`)
      return { ticket }
    } catch (err) {
      if ((err as { code?: string }).code !== 'P2002') throw err
    }
  }
  return { error: 'Could not allocate a ticket number, please try again' }
}

export async function addComment(
  ticketId: string,
  actor: Actor,
  body: string,
  isInternal = false,
): Promise<Result> {
  const text = body.trim()
  if (!text) return { error: 'Please write a message' }
  if (text.length > 5000) return { error: 'Message is too long (max 5000 characters)' }
  if (isInternal && actor.type !== 'ADMIN') return { error: 'Not allowed' }

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }
  if (ticket.status === 'CLOSED') return { error: 'This ticket is closed. Reopen it to add a message.' }

  await db.ticketComment.create({
    data: { ticketId, authorType: actor.type, authorName: actor.name, body: text, isInternal },
  })
  await db.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } })

  // A customer reply puts a "waiting for customer" ticket back in the agent's court.
  if (actor.type === 'CUSTOMER' && ticket.status === 'WAITING_CUSTOMER') {
    await changeStatus(ticketId, 'IN_PROGRESS', { type: 'SYSTEM', name: 'System' }, 'Customer replied')
  }
  return {}
}

export async function changeStatus(
  ticketId: string,
  to: TicketStatus,
  actor: Actor,
  note = '',
): Promise<Result> {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }
  if (ticket.status === to) return {}
  if (!allowedTransitions(ticket.status).includes(to)) {
    return { error: `Cannot change a ticket from "${STATUS_LABELS[ticket.status] ?? ticket.status}" to "${STATUS_LABELS[to] ?? to}"` }
  }

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      status: to,
      ...(to === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
      ...(to === 'CLOSED' ? { closedAt: new Date(), closedByType: actor.type === 'ADMIN' ? 'ADMIN' : 'CUSTOMER' } : {}),
      ...(to === 'REOPENED' ? { closedAt: null, closedByType: '', reopenCount: { increment: 1 } } : {}),
    },
  })
  await addEvent(ticketId, to === 'CLOSED' ? 'CLOSED' : to === 'REOPENED' ? 'REOPENED' : 'STATUS_CHANGED', actor, ticket.status, to, note)
  return {}
}

/** Admin marks the problem fixed. A resolution note is required so the customer sees what was done. */
export async function resolveTicket(ticketId: string, actor: Actor, note: string): Promise<Result> {
  const text = note.trim()
  if (!text) return { error: 'Please describe how the problem was resolved' }
  const result = await changeStatus(ticketId, 'RESOLVED', actor, text)
  if (result.error) return result
  await db.ticket.update({ where: { id: ticketId }, data: { resolutionNote: text } })
  return {}
}

export async function closeTicket(ticketId: string, actor: Actor, note = ''): Promise<Result> {
  return changeStatus(ticketId, 'CLOSED', actor, note.trim())
}

export async function reopenTicket(ticketId: string, actor: Actor, reason: string): Promise<Result> {
  const text = reason.trim()
  if (!text) return { error: 'Please tell us why you are reopening this ticket' }

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket not found' }
  if (ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') {
    return { error: 'Only resolved or closed tickets can be reopened' }
  }
  if (actor.type === 'CUSTOMER' && ticket.status === 'CLOSED' && ticket.closedAt) {
    const days = (Date.now() - ticket.closedAt.getTime()) / 86_400_000
    if (days > CUSTOMER_REOPEN_WINDOW_DAYS) {
      return { error: `Tickets can only be reopened within ${CUSTOMER_REOPEN_WINDOW_DAYS} days of closing. Please raise a new ticket.` }
    }
  }
  // RESOLVED -> REOPENED is allowed; CLOSED -> REOPENED too.
  return changeStatus(ticketId, 'REOPENED', actor, text)
}

/* ------------------------------------------------------------------ */
/*  Queries                                                           */
/* ------------------------------------------------------------------ */

export async function getTicketDetail(number: string, opts: { customerId?: string }) {
  const ticket = await db.ticket.findUnique({
    where: { number },
    include: {
      customer: { select: { id: true, username: true, fullName: true, phone: true, address: true, area: true, packageName: true } },
      category: { select: { nameEn: true, nameBn: true } },
      comments: { orderBy: { createdAt: 'asc' } },
      events: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!ticket) return null
  // A customer can only ever see their own tickets, and never admin-only notes.
  if (opts.customerId) {
    if (ticket.customerId !== opts.customerId) return null
    ticket.comments = ticket.comments.filter((c) => !c.isInternal)
  }
  return ticket
}
