import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCustomer } from '@/lib/auth'
import { NewTicketForm } from '@/components/support/new-ticket-form'

export default async function NewTicketPage() {
  const customer = await getCustomer()
  if (!customer) redirect('/support/login')

  const categories = await db.ticketCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, nameEn: true, nameBn: true },
  })
  return <NewTicketForm categories={categories} />
}
