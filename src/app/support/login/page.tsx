import { redirect } from 'next/navigation'
import { getCustomer } from '@/lib/auth'
import { SupportLoginForm } from '@/components/support/login-form'

export default async function SupportLoginPage() {
  if (await getCustomer()) redirect('/support/tickets')
  return <SupportLoginForm />
}
