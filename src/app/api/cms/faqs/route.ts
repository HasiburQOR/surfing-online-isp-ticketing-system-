import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, num, ok, fail } from '@/lib/cms-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const question = str(body?.question).trim()
    if (!question) return fail('question is required', 400)

    const count = await db.faqItem.count()
    const created = await db.faqItem.create({
      data: {
        question,
        answer: str(body?.answer),
        sortOrder: num(body?.sortOrder, count),
      },
    })

    revalidatePath('/', 'layout')
    return ok(created)
  } catch (err) {
    console.error('[faqs] create failed', err)
    return fail('Create failed', 500)
  }
}

export async function PUT(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    const body = await req.json()

    const existing = await db.faqItem.findUnique({ where: { id } })
    if (!existing) return fail('Not found', 404)

    const updated = await db.faqItem.update({
      where: { id },
      data: {
        question: str(body?.question, existing.question),
        answer: str(body?.answer, existing.answer),
        sortOrder: num(body?.sortOrder, existing.sortOrder),
      },
    })

    revalidatePath('/', 'layout')
    return ok(updated)
  } catch (err) {
    console.error('[faqs] update failed', err)
    return fail('Update failed', 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    await db.faqItem.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return ok({ id })
  } catch (err) {
    console.error('[faqs] delete failed', err)
    return fail('Delete failed', 500)
  }
}
