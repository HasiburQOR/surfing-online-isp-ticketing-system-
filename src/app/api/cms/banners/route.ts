import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, num, bool, safeUrl, ok, fail } from '@/lib/cms-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const imageUrl = safeUrl(body?.imageUrl)
    if (!imageUrl) return fail('A valid image is required', 400)

    const count = await db.banner.count()
    const created = await db.banner.create({
      data: {
        title: str(body?.title).trim(),
        imageUrl,
        linkUrl: safeUrl(body?.linkUrl),
        isActive: bool(body?.isActive, true),
        sortOrder: num(body?.sortOrder, count),
      },
    })

    revalidatePath('/', 'layout')
    return ok(created)
  } catch (err) {
    console.error('[banners] create failed', err)
    return fail('Create failed', 500)
  }
}

export async function PUT(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    const body = await req.json()

    const existing = await db.banner.findUnique({ where: { id } })
    if (!existing) return fail('Not found', 404)

    const imageUrl = body?.imageUrl === undefined ? existing.imageUrl : safeUrl(body.imageUrl)
    if (!imageUrl) return fail('A valid image is required', 400)

    const updated = await db.banner.update({
      where: { id },
      data: {
        title: str(body?.title, existing.title).trim(),
        imageUrl,
        linkUrl: body?.linkUrl === undefined ? existing.linkUrl : safeUrl(body.linkUrl),
        isActive: bool(body?.isActive, existing.isActive),
        sortOrder: num(body?.sortOrder, existing.sortOrder),
      },
    })

    revalidatePath('/', 'layout')
    return ok(updated)
  } catch (err) {
    console.error('[banners] update failed', err)
    return fail('Update failed', 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    await db.banner.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return ok({ id })
  } catch (err) {
    console.error('[banners] delete failed', err)
    return fail('Delete failed', 500)
  }
}
