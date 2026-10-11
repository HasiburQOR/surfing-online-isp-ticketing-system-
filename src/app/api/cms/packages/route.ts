import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, num, bool, strArray, ok, fail } from '@/lib/cms-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = str(body?.name).trim()
    if (!name) return fail('name is required', 400)

    const count = await db.package.count()
    const features = strArray(body?.features)

    const created = await db.package.create({
      data: {
        name,
        tag: str(body?.tag, 'Home'),
        speedMbps: num(body?.speedMbps, 10),
        priceBdt: num(body?.priceBdt, 0),
        period: str(body?.period, '/month'),
        isPopular: bool(body?.isPopular),
        isPublic: bool(body?.isPublic, true),
        features: JSON.stringify(features),
        sortOrder: num(body?.sortOrder, count),
      },
    })

    revalidatePath('/', 'layout')
    return ok(created)
  } catch (err) {
    console.error('[packages] create failed', err)
    return fail('Create failed', 500)
  }
}

export async function PUT(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
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

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    await db.package.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return ok({ id })
  } catch (err) {
    console.error('[packages] delete failed', err)
    return fail('Delete failed', 500)
  }
}
