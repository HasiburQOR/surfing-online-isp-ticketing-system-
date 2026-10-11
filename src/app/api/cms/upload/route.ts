import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ok, fail } from '@/lib/cms-api'
import { UPLOAD_DIR, MAX_UPLOAD_BYTES, sniffImageExt } from '@/lib/uploads'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return fail('No file provided', 400)
    if (file.size === 0) return fail('File is empty', 400)
    if (file.size > MAX_UPLOAD_BYTES) return fail('Image is too large (max 5 MB)', 413)

    const buf = Buffer.from(await file.arrayBuffer())
    const ext = sniffImageExt(buf)
    if (!ext) return fail('Unsupported file. Use a PNG, JPG, WebP or GIF image.', 415)

    await mkdir(UPLOAD_DIR, { recursive: true })
    const name = `${randomUUID()}.${ext}`
    await writeFile(path.join(UPLOAD_DIR, name), buf)

    return ok({ url: `/api/uploads/${name}` })
  } catch (err) {
    console.error('[upload] failed', err)
    return fail('Upload failed', 500)
  }
}
