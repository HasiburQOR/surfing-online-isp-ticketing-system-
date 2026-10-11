import { requireCustomer } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { createTicket } from '@/lib/tickets'
import { str, ok, fail } from '@/lib/cms-api'

/** Customer raises a new ticket. */
export async function POST(req: Request) {
  const { customer, denied } = await requireCustomer()
  if (denied) return denied

  const gate = rateLimit(`ticket-create:${customer.id}`, 10, 60 * 60 * 1000)
  if (!gate.ok) return fail('You have created several tickets recently. Please wait a while or call us.', 429)

  const body = await req.json().catch(() => ({}))
  const { ticket, error } = await createTicket({
    customerId: customer.id,
    categoryId: str(body?.categoryId),
    subject: str(body?.subject),
    description: str(body?.description),
    actor: { type: 'CUSTOMER', name: customer.fullName || customer.username },
  })
  if (error || !ticket) return fail(error || 'Could not create ticket', 400)
  return ok({ number: ticket.number })
}
