import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Signed, expiring session tokens (HMAC-SHA256). Kept free of DB/Next imports
 * so the proxy (route protection) can verify them cheaply.
 */

export type SessionKind = 'admin' | 'customer'

export interface SessionPayload {
  k: SessionKind
  id: string
  exp: number // epoch seconds
}

export const COOKIE_NAMES: Record<SessionKind, string> = {
  admin: 'so_admin',
  customer: 'so_customer',
}

export const SESSION_TTL_SECONDS: Record<SessionKind, number> = {
  admin: 60 * 60 * 12, // 12 h
  customer: 60 * 60 * 24 * 7, // 7 d
}

let cachedSecret: string | null = null

/**
 * Secret resolution order:
 *  1. SESSION_SECRET env var (16+ chars)
 *  2. a random secret generated once and kept in the persistent db volume
 *     (so logins survive restarts and redeploys with zero configuration)
 *  3. a random per-process secret (sessions end on restart, but can never be forged)
 */
function secret(): string {
  if (cachedSecret) return cachedSecret
  const env = process.env.SESSION_SECRET
  if (env && env.length >= 16) return (cachedSecret = env)

  const file = process.env.SESSION_SECRET_FILE || join(dirname(dbFilePath()), '.session-secret')
  try {
    try {
      mkdirSync(dirname(file), { recursive: true })
      // 'wx' = create only if missing, so two workers can't overwrite each other's secret.
      writeFileSync(file, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 })
    } catch (err) {
      if ((err as { code?: string }).code !== 'EEXIST') throw err
    }
    const saved = readFileSync(file, 'utf8').trim()
    if (saved.length >= 32) return (cachedSecret = saved)
  } catch {
    // fall through to the temporary secret
  }
  console.warn('[auth] No SESSION_SECRET and no writable secret file - using a temporary secret (logins reset on restart).')
  return (cachedSecret = randomBytes(32).toString('hex'))
}

function dbFilePath(): string {
  const url = process.env.DATABASE_URL || ''
  return url.startsWith('file:') ? url.slice(5) : './db/custom.db'
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url')
}

export function createToken(kind: SessionKind, id: string): string {
  const payload: SessionPayload = {
    k: kind,
    id,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS[kind],
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifyToken(token: string | undefined, kind: SessionKind): SessionPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const a = Buffer.from(sig)
  const b = Buffer.from(sign(body))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (payload.k !== kind || !payload.id) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
