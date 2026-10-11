import { redirect } from 'next/navigation'
import { getCustomer } from '@/lib/auth'

export default async function SupportHome() {
  redirect((await getCustomer()) ? '/support/tickets' : '/support/login')
}
