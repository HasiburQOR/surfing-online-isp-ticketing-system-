import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAMES, verifyToken } from '@/lib/session-token'

/**
 * Route protection for the CMS API. Every /api/cms/* endpoint reads or writes
 * site content, so it requires a valid admin session. (The /api/admin and
 * /api/support endpoints do their own checks inside each handler.)
 */
export function proxy(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAMES.admin)?.value
  if (!verifyToken(token, 'admin')) {
    return NextResponse.json({ ok: false, error: 'Not authorised' }, { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/cms/:path*'],
}
