import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Liveness/readiness probe for Docker, Dokploy and uptime monitors. Public, reveals nothing. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
