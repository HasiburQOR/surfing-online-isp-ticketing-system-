import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/auth'
import { AdminPanel } from '@/components/cms/admin-panel'

export default async function AdminPage() {
  const admin = await getAdmin()
  if (!admin) redirect('/admin/login')
  return <AdminPanel adminEmail={admin.email} />
}
