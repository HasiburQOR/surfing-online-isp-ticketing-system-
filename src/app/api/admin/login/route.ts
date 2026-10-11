import { db } from '@/lib/db'
import { burnPasswordCheck, startSession, verifyPassword } from '@/lib/auth'
import { ensureBootstrap } from '@/lib/bootstrap'
import { clientIp, failedLogins } from '@/lib/rate-limit'
import { str, ok, fail } from '@/lib/cms-api'

const MAX_FAILS = 5
const WINDOW_MS = 15 * 60 * 1000

export async function POST(req: Request) {
  try {
    await ensureBootstrap()
    const body = await req.json().catch(() => ({}))
    const email = str(body?.email).toLowerCase().trim()
    const password = str(body?.password)
    if (!email || !password) return fail('Enter your email and password', 400)

    const ip = clientIp(req)
    const keys = [`admin:${ip}:${email}`, `admin-ip:${ip}`]
    for (const k of keys) {
      const gate = failedLogins.check(k, k.startsWith('admin-ip') ? 20 : MAX_FAILS)
      if (!gate.ok) {
        return fail(`Too many failed attempts. Try again in ${Math.ceil(gate.retryAfterSec / 60)} minute(s).`, 429)
      }
    }

    const user = await db.adminUser.findUnique({ where: { email } })
    const valid = user && user.isActive ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false)
    if (!user || !valid) {
      for (const k of keys) failedLogins.fail(k, WINDOW_MS)
      return fail('Incorrect email or password', 401)
    }

    failedLogins.clear(keys[0])
    await startSession('admin', user.id)
    return ok({ email: user.email })
  } catch (err) {
    console.error('[admin/login] failed', err)
    return fail('Login failed', 500)
  }
}
