import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, num, bool, strArray, ok, fail } from '@/lib/cms-api'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.package.findUnique({ where: { id } })
    if (!existing) return fail('Not found', 404)

    const features = strArray(body?.features)

    const updated = await db.package.update({
      where: { id },
      data: {
        name: str(body?.name, existing.name),
        tag: str(body?.tag, existing.tag),
        speedMbps: num(body?.speedMbps, existing.speedMbps),
        priceBdt: num(body?.priceBdt, existing.priceBdt),
        period: str(body?.period, existing.period),
        isPopular: bool(body?.isPopular, existing.isPopular),
        isPublic: bool(body?.isPublic, existing.isPublic),
        features: JSON.stringify(features),
        sortOrder: num(body?.sortOrder, existing.sortOrder),
      },
    })

    revalidatePath('/', 'layout')
    return ok(updated)
  } catch (err) {
    console.error('[packages] update failed', err)
    return fail('Update failed', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.package.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return ok({ id })
  } catch (err) {
    console.error('[packages] delete failed', err)
    return fail('Delete failed', 500)
  }
}
