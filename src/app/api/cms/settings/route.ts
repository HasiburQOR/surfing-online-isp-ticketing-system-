import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, strArray, ok, fail } from '@/lib/cms-api'

export async function PUT(req: Request) {
  try {
    const body = await req.json()

    const data = {
      brandName: str(body?.brandName),
      brandTagline: str(body?.brandTagline),
      heroEyebrow: str(body?.heroEyebrow),
      heroTitle: str(body?.heroTitle),
      heroAccent: str(body?.heroAccent),
      heroSubtitle: str(body?.heroSubtitle),
      primaryCta: str(body?.primaryCta),
      secondaryCta: str(body?.secondaryCta),
      phone: str(body?.phone),
      whatsapp: str(body?.whatsapp),
      email: str(body?.email),
      address: str(body?.address),
      portalUrl: str(body?.portalUrl),
      payUrl: str(body?.payUrl),
      metaTitle: str(body?.metaTitle),
      metaDescription: str(body?.metaDescription),
      heroBadges: JSON.stringify(strArray(body?.heroBadges).map((b) => b.trim()).filter(Boolean).slice(0, 8)),
    }

    const settings = await db.siteSetting.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    })

    revalidatePath('/', 'layout')
    return ok({ settings })
  } catch (err) {
    console.error('[cms/settings] update failed', err)
    return fail('Settings update failed', 500)
  }
}
