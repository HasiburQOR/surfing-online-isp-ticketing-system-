import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, num, ok, fail } from '@/lib/cms-api'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.supportChannel.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return ok({ id })
  } catch (err) {
    console.error('[support] delete failed', err)
    return fail('Delete failed', 500)
  }
}
