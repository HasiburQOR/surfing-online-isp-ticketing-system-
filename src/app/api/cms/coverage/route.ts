import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { str, num, bool, geoFields, makeSlug, ok, fail } from '@/lib/cms-api'
import { Prisma } from '@prisma/client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = str(body?.name).trim()
    if (!name) return fail('name is required', 400)

    const count = await db.coverageArea.count()
    let slug = str(body?.slug)
    if (!slug) slug = makeSlug(name)

    let created
    try {
      created = await db.coverageArea.create({
        data: {
          name,
          slug,
          description: str(body?.description, ''),
          available: bool(body?.available, true),
          sortOrder: num(body?.sortOrder, count),
          ...geoFields(body),
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // unique constraint on slug — append timestamp and retry
        const fallbackSlug = `${slug}-${Date.now()}`
        created = await db.coverageArea.create({
          data: {
            name,
            slug: fallbackSlug,
            description: str(body?.description, ''),
            available: bool(body?.available, true),
            sortOrder: num(body?.sortOrder, count),
          ...geoFields(body),
          },
        })
      } else {
        throw err
      }
    }

    revalidatePath('/', 'layout')
    return ok(created)
  } catch (err) {
    console.error('[coverage] create failed', err)
    return fail('Create failed', 500)
  }
}

export async function PUT(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    const body = await req.json()

    const existing = await db.coverageArea.findUnique({ where: { id } })
    if (!existing) return fail('Not found', 404)

    const name = str(body?.name, existing.name)
    let slug = str(body?.slug, existing.slug)
    if (!slug) slug = makeSlug(name, existing.slug)

    let updated
    try {
      updated = await db.coverageArea.update({
        where: { id },
        data: {
          name,
          slug,
          description: str(body?.description, existing.description),
          available: bool(body?.available, existing.available),
          sortOrder: num(body?.sortOrder, existing.sortOrder),
          ...geoFields(body, existing),
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const fallbackSlug = `${slug}-${Date.now()}`
        updated = await db.coverageArea.update({
          where: { id },
          data: {
            name,
            slug: fallbackSlug,
            description: str(body?.description, existing.description),
            available: bool(body?.available, existing.available),
            sortOrder: num(body?.sortOrder, existing.sortOrder),
          ...geoFields(body, existing),
          },
        })
      } else {
        throw err
      }
    }

    revalidatePath('/', 'layout')
    return ok(updated)
  } catch (err) {
    console.error('[coverage] update failed', err)
    return fail('Update failed', 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return fail('Missing id parameter')
    await db.coverageArea.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return ok({ id })
  } catch (err) {
    console.error('[coverage] delete failed', err)
    return fail('Delete failed', 500)
  }
}
