import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, num, ok, fail } from '@/lib/cms-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const title = str(body?.title).trim()
    if (!title) return fail('title is required', 400)

    const count = await db.benefit.count()
    const created = await db.benefit.create({
      data: {
        title,
        description: str(body?.description),
        iconName: str(body?.iconName, 'Zap'),
        sortOrder: num(body?.sortOrder, count),
      },
    })

    revalidatePath('/', 'layout')
    return ok(created)
  } catch (err) {
    console.error('[benefits] create failed', err)
    return fail('Create failed', 500)
  }
}

export async function PUT(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    const body = await req.json()

    const existing = await db.benefit.findUnique({ where: { id } })
    if (!existing) return fail('Not found', 404)

    const updated = await db.benefit.update({
      where: { id },
      data: {
        title: str(body?.title, existing.title),
        description: str(body?.description, existing.description),
        iconName: str(body?.iconName, existing.iconName),
        sortOrder: num(body?.sortOrder, existing.sortOrder),
      },
    })

    revalidatePath('/', 'layout')
    return ok(updated)
  } catch (err) {
    console.error('[benefits] update failed', err)
    return fail('Update failed', 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    await db.benefit.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return ok({ id })
  } catch (err) {
    console.error('[benefits] delete failed', err)
    return fail('Delete failed', 500)
  }
}
