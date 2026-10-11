import { db } from '@/lib/db'
import { requireCustomer } from '@/lib/auth'
import { addComment, closeTicket, reopenTicket, type Actor } from '@/lib/tickets'
import { str, ok, fail } from '@/lib/cms-api'

/** Customer actions on one of their own tickets: comment | close | reopen. */
export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { customer, denied } = await requireCustomer()
  if (denied) return denied

  const { number } = await params
  // Scoped to the logged-in customer: someone else's ticket number looks like "not found".
  const ticket = await db.ticket.findFirst({ where: { number, customerId: customer.id } })
  if (!ticket) return fail('Ticket not found', 404)

  const body = await req.json().catch(() => ({}))
  const actor: Actor = { type: 'CUSTOMER', name: customer.fullName || customer.username }

  let result: { error?: string }
  switch (str(body?.action)) {
    case 'comment':
      result = await addComment(ticket.id, actor, str(body?.body))
      break
    case 'close':
      result = await closeTicket(ticket.id, actor, str(body?.note))
      break
    case 'reopen':
      result = await reopenTicket(ticket.id, actor, str(body?.reason))
      break
    default:
      return fail('Unknown action', 400)
  }
  if (result.error) return fail(result.error, 400)
  return ok({ done: true })
}
