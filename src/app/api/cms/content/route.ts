import { getCmsContent } from '@/lib/cms'
import { fail } from '@/lib/cms-api'

export async function GET() {
  try {
    const content = await getCmsContent()
    return Response.json(content)
  } catch (err) {
    console.error('[cms/content] fetch failed', err)
    return fail('Failed to load content', 500)
  }
}
