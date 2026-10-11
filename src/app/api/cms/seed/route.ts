import { revalidatePath } from 'next/cache'
import { seedCmsContent } from '@/lib/seed'
import { ok, fail } from '@/lib/cms-api'

export async function POST() {
  try {
    const results = await seedCmsContent()
    revalidatePath('/', 'layout')
    return Response.json({ ok: true, seeded: results })
  } catch (err) {
    console.error('[cms/seed] failed', err)
    return fail('Seed failed', 500)
  }
}
