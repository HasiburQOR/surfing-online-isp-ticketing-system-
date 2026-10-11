import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies, headers } from 'next/headers'
import { db } from '@/lib/db'
import {
  COOKIE_NAMES,
  SESSION_TTL_SECONDS,
  createToken,
  verifyToken,
  type SessionKind,
} from '@/lib/session-token'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

/* ------------------------------------------------------------------ */
/*  Passwords                                                         */
/* ------------------------------------------------------------------ */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `s1$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [v, saltHex, hashHex] = stored.split('$')
  if (v !== 's1' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

// Compare against a real hash when the user does not exist, so response time
// does not reveal which usernames are valid.
let dummyHash: Promise<string> | null = null
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword('not-a-real-password')
  await verifyPassword(password, await dummyHash)
}

/* ------------------------------------------------------------------ */
/*  Session cookies                                                   */
/* ------------------------------------------------------------------ */

async function isHttps(): Promise<boolean> {
  const h = await headers()
  return (h.get('x-forwarded-proto') || '').split(',')[0].trim() === 'https'
}

export async function startSession(kind: SessionKind, id: string) {
  const jar = await cookies()
  jar.set(COOKIE_NAMES[kind], createToken(kind, id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: await isHttps(),
    path: '/',
    maxAge: SESSION_TTL_SECONDS[kind],
  })
}

export async function endSession(kind: SessionKind) {
  const jar = await cookies()
  jar.set(COOKIE_NAMES[kind], '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}

/* ------------------------------------------------------------------ */
/*  Current user. Re-checked against the DB on every call, so         */
/*  deactivating an account takes effect immediately.                 */
/* ------------------------------------------------------------------ */

export async function getAdmin() {
  const jar = await cookies()
  const payload = verifyToken(jar.get(COOKIE_NAMES.admin)?.value, 'admin')
  if (!payload) return null
  const user = await db.adminUser.findUnique({ where: { id: payload.id } })
  return user && user.isActive ? user : null
}

export async function getCustomer() {
  const jar = await cookies()
  const payload = verifyToken(jar.get(COOKIE_NAMES.customer)?.value, 'customer')
  if (!payload) return null
  const user = await db.customer.findUnique({ where: { id: payload.id } })
  return user && user.isActive ? user : null
}

/** For API routes: returns the admin, or a ready-made 401 response. */
export async function requireAdmin() {
  const admin = await getAdmin()
  if (!admin) {
    return { admin: null, denied: Response.json({ ok: false, error: 'Not authorised' }, { status: 401 }) }
  }
  return { admin, denied: null }
}

export async function requireCustomer() {
  const customer = await getCustomer()
  if (!customer) {
    return { customer: null, denied: Response.json({ ok: false, error: 'Please log in again' }, { status: 401 }) }
  }
  return { customer, denied: null }
}
