import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { str, num, bool, ok, fail } from '@/lib/cms-api'

export async function GET() {
  const { denied } = await requireAdmin()
  if (denied) return denied
  const categories = await db.ticketCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { tickets: true } } },
  })
  return ok(categories)
}

export async function POST(req: Request) {
  const { denied } = await requireAdmin()
  if (denied) return denied
  const body = await req.json().catch(() => ({}))
  const nameEn = str(body?.nameEn).trim()
  if (!nameEn) return fail('Name is required', 400)
  const count = await db.ticketCategory.count()
  const created = await db.ticketCategory.create({
    data: {
      nameEn,
      nameBn: str(body?.nameBn).trim(),
      isActive: bool(body?.isActive, true),
      sortOrder: num(body?.sortOrder, count),
    },
  })
  return ok(created)
}

export async function PUT(req: Request) {
  const { denied } = await requireAdmin()
  if (denied) return denied
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail('Missing id parameter')
  const existing = await db.ticketCategory.findUnique({ where: { id } })
  if (!existing) return fail('Not found', 404)
  const body = await req.json().catch(() => ({}))
  const nameEn = str(body?.nameEn, existing.nameEn).trim()
  if (!nameEn) return fail('Name is required', 400)
  const updated = await db.ticketCategory.update({
    where: { id },
    data: {
      nameEn,
      nameBn: str(body?.nameBn, existing.nameBn).trim(),
      isActive: bool(body?.isActive, existing.isActive),
      sortOrder: num(body?.sortOrder, existing.sortOrder),
    },
  })
  return ok(updated)
}

export async function DELETE(req: Request) {
  const { denied } = await requireAdmin()
  if (denied) return denied
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail('Missing id parameter')
  const used = await db.ticket.count({ where: { categoryId: id } })
  if (used > 0) return fail('Tickets use this category, so it cannot be deleted. Turn it off instead.', 409)
  await db.ticketCategory.delete({ where: { id } })
  return ok({ id })
}
