import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok } from '@/lib/cms-api'

/** Numbers for the sidebar badges. */
export async function GET() {
  const { denied } = await requireAdmin()
  if (denied) return denied
  const [newLeads, activeTickets] = await Promise.all([
    db.lead.count({ where: { status: 'NEW' } }),
    db.ticket.count({ where: { status: { not: 'CLOSED' } } }),
  ])
  return ok({ newLeads, activeTickets })
}
