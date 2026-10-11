import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import {
  PRIORITIES,
  STATUSES,
  addComment,
  changeStatus,
  closeTicket,
  getTicketDetail,
  reopenTicket,
  resolveTicket,
  type Actor,
  type TicketStatus,
} from '@/lib/tickets'
import { str, bool, ok, fail } from '@/lib/cms-api'

export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { denied } = await requireAdmin()
  if (denied) return denied
  const { number } = await params
  const ticket = await getTicketDetail(number, {})
  if (!ticket) return fail('Ticket not found', 404)
  return ok(ticket)
}

/** Admin actions: comment | status | resolve | close | reopen | priority. */
export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { admin, denied } = await requireAdmin()
  if (denied) return denied

  const { number } = await params
  const ticket = await db.ticket.findUnique({ where: { number } })
  if (!ticket) return fail('Ticket not found', 404)

  const body = await req.json().catch(() => ({}))
  const actor: Actor = { type: 'ADMIN', name: admin.fullName || 'Admin' }

  let result: { error?: string } = {}
  switch (str(body?.action)) {
    case 'comment':
      result = await addComment(ticket.id, actor, str(body?.body), bool(body?.isInternal))
      break
    case 'status': {
      const to = str(body?.to)
      if (!(STATUSES as readonly string[]).includes(to)) return fail('Invalid status', 400)
      result = await changeStatus(ticket.id, to as TicketStatus, actor, str(body?.note))
      break
    }
    case 'resolve':
      result = await resolveTicket(ticket.id, actor, str(body?.note))
      break
    case 'close':
      result = await closeTicket(ticket.id, actor, str(body?.note))
      break
    case 'reopen':
      result = await reopenTicket(ticket.id, actor, str(body?.reason))
      break
    case 'priority': {
      const priority = str(body?.priority)
      if (!(PRIORITIES as readonly string[]).includes(priority)) return fail('Invalid priority', 400)
      await db.ticket.update({ where: { id: ticket.id }, data: { priority } })
      break
    }
    default:
      return fail('Unknown action', 400)
  }
  if (result.error) return fail(result.error, 400)
  return ok({ done: true })
}
