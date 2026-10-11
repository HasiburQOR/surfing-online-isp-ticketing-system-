import { db } from '@/lib/db'
import { hashPassword, requireAdmin } from '@/lib/auth'
import { str, bool, ok, fail } from '@/lib/cms-api'

const USERNAME_RE = /^[a-z0-9._-]{3,40}$/

// Never send passwordHash to the browser.
const PUBLIC_FIELDS = {
  id: true,
  username: true,
  fullName: true,
  phone: true,
  address: true,
  area: true,
  packageName: true,
  isActive: true,
  createdAt: true,
  _count: { select: { tickets: true } },
} as const

export async function GET(req: Request) {
  const { denied } = await requireAdmin()
  if (denied) return denied

  const q = (new URL(req.url).searchParams.get('q') || '').trim()
  const customers = await db.customer.findMany({
    where: q
      ? { OR: [{ username: { contains: q.toLowerCase() } }, { fullName: { contains: q } }, { phone: { contains: q } }] }
      : undefined,
    select: PUBLIC_FIELDS,
    orderBy: { createdAt: 'desc' },
    take: 300,
  })
  return ok(customers)
}

export async function POST(req: Request) {
  const { denied } = await requireAdmin()
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const username = str(body?.username).toLowerCase().trim()
  const password = str(body?.password)

  if (!USERNAME_RE.test(username)) {
    return fail('Username must be 3-40 characters: letters, numbers, dot, dash or underscore', 400)
  }
  if (password.length < 6) return fail('Password must be at least 6 characters', 400)
  if (await db.customer.findUnique({ where: { username } })) return fail('That username is already taken', 409)

  const created = await db.customer.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      fullName: str(body?.fullName).trim(),
      phone: str(body?.phone).trim(),
      address: str(body?.address).trim(),
      area: str(body?.area).trim(),
      packageName: str(body?.packageName).trim(),
      isActive: bool(body?.isActive, true),
    },
    select: PUBLIC_FIELDS,
  })
  return ok(created)
}

export async function PUT(req: Request) {
  const { denied } = await requireAdmin()
  if (denied) return denied

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail('Missing id parameter')
  const existing = await db.customer.findUnique({ where: { id } })
  if (!existing) return fail('Not found', 404)

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {
    fullName: str(body?.fullName, existing.fullName).trim(),
    phone: str(body?.phone, existing.phone).trim(),
    address: str(body?.address, existing.address).trim(),
    area: str(body?.area, existing.area).trim(),
    packageName: str(body?.packageName, existing.packageName).trim(),
    isActive: bool(body?.isActive, existing.isActive),
  }

  const newUsername = str(body?.username, existing.username).toLowerCase().trim()
  if (newUsername !== existing.username) {
    if (!USERNAME_RE.test(newUsername)) return fail('Invalid username', 400)
    if (await db.customer.findUnique({ where: { username: newUsername } })) return fail('That username is already taken', 409)
    data.username = newUsername
  }

  // Password is only changed when a new one is supplied (admin "reset password").
  const newPassword = str(body?.password)
  if (newPassword) {
    if (newPassword.length < 6) return fail('Password must be at least 6 characters', 400)
    data.passwordHash = await hashPassword(newPassword)
  }

  const updated = await db.customer.update({ where: { id }, data, select: PUBLIC_FIELDS })
  return ok(updated)
}

export async function DELETE(req: Request) {
  const { denied } = await requireAdmin()
  if (denied) return denied

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail('Missing id parameter')
  const count = await db.ticket.count({ where: { customerId: id } })
  if (count > 0) return fail('This customer has tickets, so they cannot be deleted. Deactivate the account instead.', 409)
  await db.customer.delete({ where: { id } })
  return ok({ id })
}
