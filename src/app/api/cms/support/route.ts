import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, num, ok, fail } from '@/lib/cms-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const title = str(body?.title).trim()
    if (!title) return fail('title is required', 400)

    const count = await db.supportChannel.count()
    const created = await db.supportChannel.create({
      data: {
        title,
        value: str(body?.value),
        subtitle: str(body?.subtitle, ''),
        iconName: str(body?.iconName, 'Phone'),
        sortOrder: num(body?.sortOrder, count),
      },
    })

    revalidatePath('/', 'layout')
    return ok(created)
  } catch (err) {
    console.error('[support] create failed', err)
    return fail('Create failed', 500)
  }
}

export async function PUT(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    const body = await req.json()

    const existing = await db.supportChannel.findUnique({ where: { id } })
    if (!existing) return fail('Not found', 404)

    const updated = await db.supportChannel.update({
      where: { id },
      data: {
        title: str(body?.title, existing.title),
        value: str(body?.value, existing.value),
        subtitle: str(body?.subtitle, existing.subtitle),
        iconName: str(body?.iconName, existing.iconName),
        sortOrder: num(body?.sortOrder, existing.sortOrder),
      },
    })

    revalidatePath('/', 'layout')
    return ok(updated)
  } catch (err) {
    console.error('[support] update failed', err)
    return fail('Update failed', 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    await db.supportChannel.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return ok({ id })
  } catch (err) {
    console.error('[support] delete failed', err)
    return fail('Delete failed', 500)
  }
}
