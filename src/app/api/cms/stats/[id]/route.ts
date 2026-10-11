import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, num, ok, fail } from '@/lib/cms-api'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.stat.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return ok({ id })
  } catch (err) {
    console.error('[stats] delete failed', err)
    return fail('Delete failed', 500)
  }
}
