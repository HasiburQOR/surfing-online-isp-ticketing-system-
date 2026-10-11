import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { UPLOAD_DIR, MIME_BY_EXT } from '@/lib/uploads'

// Only files we generated: <uuid>.<ext> — blocks any path traversal.
const NAME_RE = /^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  if (!NAME_RE.test(name)) return new Response('Not found', { status: 404 })

  try {
    const data = await readFile(path.join(UPLOAD_DIR, name))
    const ext = name.split('.').pop() as string
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': MIME_BY_EXT[ext],
        'X-Content-Type-Options': 'nosniff',
        // filenames are random UUIDs and never reused, so they can cache hard
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
