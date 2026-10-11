import { db } from '@/lib/db'
import { burnPasswordCheck, startSession, verifyPassword } from '@/lib/auth'
import { ensureBootstrap } from '@/lib/bootstrap'
import { clientIp, failedLogins } from '@/lib/rate-limit'
import { str, ok, fail } from '@/lib/cms-api'

const MAX_FAILS = 5
const WINDOW_MS = 15 * 60 * 1000

/** Customer login: the username and password issued by the ISP. */
export async function POST(req: Request) {
  try {
    await ensureBootstrap()
    const body = await req.json().catch(() => ({}))
    const username = str(body?.username).toLowerCase().trim()
    const password = str(body?.password)
    if (!username || !password) return fail('Enter your username and password', 400)

    const ip = clientIp(req)
    const keys = [`cust:${ip}:${username}`, `cust-ip:${ip}`]
    for (const k of keys) {
      const gate = failedLogins.check(k, k.startsWith('cust-ip') ? 30 : MAX_FAILS)
      if (!gate.ok) {
        return fail(`Too many failed attempts. Try again in ${Math.ceil(gate.retryAfterSec / 60)} minute(s).`, 429)
      }
    }

    const customer = await db.customer.findUnique({ where: { username } })
    const valid =
      customer && customer.isActive
        ? await verifyPassword(password, customer.passwordHash)
        : (await burnPasswordCheck(password), false)
    if (!customer || !valid) {
      for (const k of keys) failedLogins.fail(k, WINDOW_MS)
      return fail('Incorrect username or password', 401)
    }

    failedLogins.clear(keys[0])
    await startSession('customer', customer.id)
    return ok({ username: customer.username })
  } catch (err) {
    console.error('[support/login] failed', err)
    return fail('Login failed', 500)
  }
}
