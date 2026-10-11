import { db } from '@/lib/db'
import { hashPassword, requireAdmin, verifyPassword } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { str, ok, fail } from '@/lib/cms-api'

export async function POST(req: Request) {
  const { admin, denied } = await requireAdmin()
  if (denied) return denied

  const gate = rateLimit(`admin-pw:${clientIp(req)}`, 10, 15 * 60 * 1000)
  if (!gate.ok) return fail('Too many attempts. Try again later.', 429)

  const body = await req.json().catch(() => ({}))
  const current = str(body?.current)
  const next = str(body?.next)

  if (next.length < 8) return fail('New password must be at least 8 characters', 400)
  if (!(await verifyPassword(current, admin.passwordHash))) return fail('Current password is incorrect', 400)

  await db.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(next) } })
  return ok({ changed: true })
}
