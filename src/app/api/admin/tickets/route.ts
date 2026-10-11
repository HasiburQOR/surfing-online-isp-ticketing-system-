import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { CHANNELS, PRIORITIES, STATUSES, createTicket, type Channel, type Priority } from '@/lib/tickets'
import { str, ok, fail } from '@/lib/cms-api'

/** Ticket list (admin only) with per-status counts for the filter tabs. */
export async function GET(req: Request) {
  const { denied } = await requireAdmin()
  if (denied) return denied

  const sp = new URL(req.url).searchParams
  const status = sp.get('status') || ''
  const q = (sp.get('q') || '').trim()

  const where = {
    ...(status === 'ACTIVE'
      ? { status: { not: 'CLOSED' } }
      : (STATUSES as readonly string[]).includes(status)
        ? { status }
        : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q.toUpperCase() } },
            { subject: { contains: q } },
            { customer: { is: { username: { contains: q.toLowerCase() } } } },
            { customer: { is: { fullName: { contains: q } } } },
            { customer: { is: { phone: { contains: q } } } },
          ],
        }
      : {}),
  }

  const [tickets, grouped] = await Promise.all([
    db.ticket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        customer: { select: { username: true, fullName: true, phone: true } },
        category: { select: { nameEn: true } },
      },
    }),
    db.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const counts: Record<string, number> = {}
  for (const g of grouped) counts[g.status] = g._count._all
  return ok({ tickets, counts })
}

/** Admin raises a ticket on behalf of a customer (e.g. they phoned or walked in). */
export async function POST(req: Request) {
  const { admin, denied } = await requireAdmin()
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const priority = str(body?.priority, 'NORMAL')
  const channel = str(body?.channel, 'PHONE')
  if (!(PRIORITIES as readonly string[]).includes(priority)) return fail('Invalid priority', 400)
  if (!(CHANNELS as readonly string[]).includes(channel)) return fail('Invalid channel', 400)

  const { ticket, error } = await createTicket({
    customerId: str(body?.customerId),
    categoryId: str(body?.categoryId),
    subject: str(body?.subject),
    description: str(body?.description),
    priority: priority as Priority,
    channel: channel as Channel,
    actor: { type: 'ADMIN', name: admin.fullName || 'Admin' },
  })
  if (error || !ticket) return fail(error || 'Could not create ticket', 400)
  return ok({ number: ticket.number })
}
