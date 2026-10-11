import { db } from '@/lib/db'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { str, ok, fail } from '@/lib/cms-api'

/** Public "Request a New Connection" form. Lands in Admin → Connection Requests. */
export async function POST(req: Request) {
  try {
    // Public endpoint: cap submissions per IP so it can't be used to flood the inbox.
    const gate = rateLimit(`lead:${clientIp(req)}`, 5, 60 * 60 * 1000)
    if (!gate.ok) return fail('Too many requests. Please call us instead.', 429)

    const body = await req.json()
    const name = str(body?.name).trim().slice(0, 120)
    const phone = str(body?.phone).trim().slice(0, 30)

    if (!name || !phone) {
      return fail('name and phone are required', 400)
    }

    await db.lead.create({
      data: {
        name,
        phone,
        address: str(body?.address).slice(0, 300),
        area: str(body?.area).slice(0, 120),
        packageInterest: str(body?.packageInterest).slice(0, 120),
        message: str(body?.message).slice(0, 2000),
        status: 'NEW',
      },
    })

    // Intentionally no revalidatePath - leads do not affect public content.
    return ok({ submitted: true })
  } catch (err) {
    console.error('[leads] create failed', err)
    return fail('Failed to submit lead', 500)
  }
}
