import { getCookie, setCookie } from 'hono/cookie'
import { db } from './db'
import bcrypt from 'bcryptjs'
import type { Context } from 'hono'

/* ------------------------------------------------------------------ */
/*  URL helper — appends XTransformPort to all internal links        */
/* ------------------------------------------------------------------ */

const PORT = 3001

export function u(path: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}XTransformPort=${PORT}`
}

/* ------------------------------------------------------------------ */
/*  Session types                                                     */
/* ------------------------------------------------------------------ */

export interface CustomerSession {
  type: 'customer'
  customerId: string
  username: string
  fullName: string
}

export interface StaffSession {
  type: 'staff'
  staffId: string
  email: string
  username: string
  role: string
  fullName: string
}

export type Session = CustomerSession | StaffSession | null

/* ------------------------------------------------------------------ */
/*  Simple signed cookie session                                      */
/*  Format: base64(JSON(session)).signature                          */
/* ------------------------------------------------------------------ */

const SESSION_SECRET = process.env.SESSION_SECRET || 'surfing-online-ticketing-secret-2026'
const COOKIE_NAME = 'tk_session'

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return Buffer.from(sig).slice(0, 16).toString('base64url')
}

async function verifySig(data: string, sig: string): Promise<boolean> {
  const expected = await sign(data)
  return expected === sig
}

async function encodeSession(session: Session): Promise<string> {
  const json = JSON.stringify(session)
  const b64 = Buffer.from(json).toString('base64url')
  const sig = await sign(b64)
  return `${b64}.${sig}`
}

async function decodeSession(token: string): Promise<Session> {
  const [b64, sig] = token.split('.')
  if (!b64 || !sig) return null
  const valid = await verifySig(b64, sig)
  if (!valid) return null
  try {
    const json = Buffer.from(b64, 'base64url').toString()
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function setSession(c: Context, session: Session) {
  const token = await encodeSession(session)
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getSession(c: Context): Promise<Session> {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) return null
  return decodeSession(token)
}

export function clearSession(c: Context) {
  setCookie(c, COOKIE_NAME, '', { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 0 })
}

/* ------------------------------------------------------------------ */
/*  Auth helpers                                                      */
/* ------------------------------------------------------------------ */

export async function verifyStaffLogin(email: string, password: string) {
  const staff = await db.staffUser.findUnique({ where: { email: email.toLowerCase() } })
  if (!staff || !staff.isActive) return null
  const match = await bcrypt.compare(password, staff.passwordHash)
  if (!match) return null
  return staff
}
