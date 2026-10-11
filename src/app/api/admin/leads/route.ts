import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { str, ok, fail } from '@/lib/cms-api'

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'SCHEDULED', 'CONNECTED', 'REJECTED'] as const

/** Connection requests submitted from the public "Request a New Connection" form. */
export async function GET() {
  const { denied } = await requireAdmin()
  if (denied) return denied
  const leads = await db.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })
  return ok(leads)
}

export async function PUT(req: Request) {
  const { denied } = await requireAdmin()
  if (denied) return denied
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail('Missing id parameter')
  const existing = await db.lead.findUnique({ where: { id } })
  if (!existing) return fail('Not found', 404)

  const body = await req.json().catch(() => ({}))
  const status = str(body?.status, existing.status)
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) return fail('Invalid status', 400)

  const updated = await db.lead.update({
    where: { id },
    data: { status, notes: str(body?.notes, existing.notes).slice(0, 2000) },
  })
  return ok(updated)
}

export async function DELETE(req: Request) {
  const { denied } = await requireAdmin()
  if (denied) return denied
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail('Missing id parameter')
  await db.lead.delete({ where: { id } })
  return ok({ id })
}
