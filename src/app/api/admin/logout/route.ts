import { endSession } from '@/lib/auth'
import { ok } from '@/lib/cms-api'

export async function POST() {
  await endSession('admin')
  return ok({ loggedOut: true })
}
