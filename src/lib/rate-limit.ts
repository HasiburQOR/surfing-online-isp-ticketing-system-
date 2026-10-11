/** Tiny in-memory limiter (per server process - fine for a single container). */

const hits = new Map<string, { count: number; resetAt: number }>()

/** Fixed window: allow `max` calls per `windowMs` for this key. */
export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0 }
  }
  entry.count++
  if (entry.count > max) return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
  return { ok: true, retryAfterSec: 0 }
}

/**
 * Failed-login tracking: check() before verifying the password, fail() after
 * a wrong one, clear() after a correct one.
 */
export const failedLogins = {
  check(key: string, max: number): { ok: boolean; retryAfterSec: number } {
    const e = hits.get(key)
    if (!e || e.resetAt <= Date.now()) return { ok: true, retryAfterSec: 0 }
    return e.count >= max
      ? { ok: false, retryAfterSec: Math.ceil((e.resetAt - Date.now()) / 1000) }
      : { ok: true, retryAfterSec: 0 }
  },
  fail(key: string, windowMs: number) {
    const now = Date.now()
    const e = hits.get(key)
    if (!e || e.resetAt <= now) hits.set(key, { count: 1, resetAt: now + windowMs })
    else e.count++
  },
  clear(key: string) {
    hits.delete(key)
  },
}

// Keep the map from growing forever.
const sweeper = setInterval(() => {
  const now = Date.now()
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
}, 10 * 60 * 1000)
sweeper.unref?.()

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
