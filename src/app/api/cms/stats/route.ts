import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, num, ok, fail } from '@/lib/cms-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const label = str(body?.label).trim()
    if (!label) return fail('label is required', 400)

    const count = await db.stat.count()
    const created = await db.stat.create({
      data: {
        label,
        value: str(body?.value),
        iconName: str(body?.iconName, 'Users'),
        sortOrder: num(body?.sortOrder, count),
      },
    })

    revalidatePath('/', 'layout')
    return ok(created)
  } catch (err) {
    console.error('[stats] create failed', err)
    return fail('Create failed', 500)
  }
}

export async function PUT(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    const body = await req.json()

    const existing = await db.stat.findUnique({ where: { id } })
    if (!existing) return fail('Not found', 404)

    const updated = await db.stat.update({
      where: { id },
      data: {
        label: str(body?.label, existing.label),
        value: str(body?.value, existing.value),
        iconName: str(body?.iconName, existing.iconName),
        sortOrder: num(body?.sortOrder, existing.sortOrder),
      },
    })

    revalidatePath('/', 'layout')
    return ok(updated)
  } catch (err) {
    console.error('[stats] update failed', err)
    return fail('Update failed', 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    await db.stat.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return ok({ id })
  } catch (err) {
    console.error('[stats] delete failed', err)
    return fail('Delete failed', 500)
  }
}
