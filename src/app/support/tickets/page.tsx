import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Inbox, Plus } from 'lucide-react'
import { db } from '@/lib/db'
import { getCustomer } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge, fmtDateTime } from '@/components/ticketing/ticket-ui'

export default async function MyTicketsPage() {
  const customer = await getCustomer()
  if (!customer) redirect('/support/login')

  const tickets = await db.ticket.findMany({
    where: { customerId: customer.id },
    orderBy: { updatedAt: 'desc' },
    include: { category: { select: { nameEn: true } } },
  })
  const active = tickets.filter((t) => t.status !== 'CLOSED')
  const closed = tickets.filter((t) => t.status === 'CLOSED')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Tickets</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {customer.fullName || customer.username}
            {customer.packageName ? ` · ${customer.packageName}` : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/support/tickets/new">
            <Plus className="h-4 w-4" /> New ticket
          </Link>
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card className="items-center gap-3 p-10 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">You have no tickets yet</p>
          <p className="text-sm text-muted-foreground">Having a problem with your connection? Raise a ticket and we&apos;ll get on it.</p>
          <Button asChild>
            <Link href="/support/tickets/new">Raise a ticket</Link>
          </Button>
        </Card>
      ) : (
        <>
          <TicketGroup title="Open tickets" tickets={active} empty="No open tickets." />
          {closed.length > 0 ? <TicketGroup title="Closed tickets" tickets={closed} empty="" /> : null}
        </>
      )}
    </div>
  )
}

function TicketGroup({
  title,
  tickets,
  empty,
}: {
  title: string
  tickets: { id: string; number: string; subject: string; status: string; updatedAt: Date; category: { nameEn: string } }[]
  empty: string
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title} ({tickets.length})
      </h2>
      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} href={`/support/tickets/${t.number}`} className="block">
              <Card className="flex-row items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{t.number}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="truncate font-medium text-foreground">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.category.nameEn} · Updated {fmtDateTime(t.updatedAt)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
