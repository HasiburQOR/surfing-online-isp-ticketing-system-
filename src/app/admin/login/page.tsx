import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/auth'
import { AdminLoginForm } from '@/components/cms/admin-login-form'

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect('/admin')
  return <AdminLoginForm />
}
