import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { getCustomer } from '@/lib/auth'
import { getTicketDetail } from '@/lib/tickets'
import { Card } from '@/components/ui/card'
import { StatusBadge, fmtDateTime } from '@/components/ticketing/ticket-ui'
import { TicketThread } from '@/components/ticketing/ticket-thread'
import { CustomerTicketActions } from '@/components/support/ticket-actions'

export default async function CustomerTicketPage({ params }: { params: Promise<{ number: string }> }) {
  const customer = await getCustomer()
  if (!customer) redirect('/support/login')

  const { number } = await params
  const ticket = await getTicketDetail(decodeURIComponent(number), { customerId: customer.id })
  if (!ticket) notFound()

  const comments = ticket.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))
  const events = ticket.events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/support/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My tickets
      </Link>

      <Card className="gap-4 p-5 sm:p-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{ticket.number}</span>
            <StatusBadge status={ticket.status} />
          </div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{ticket.subject}</h1>
          <p className="text-xs text-muted-foreground">
            {ticket.category.nameEn} · Opened {fmtDateTime(ticket.createdAt)}
            {ticket.createdByType === 'ADMIN' ? ' (by our support team)' : ''}
          </p>
        </div>
        {ticket.description ? (
          <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm text-foreground">{ticket.description}</p>
        ) : null}
        {ticket.resolutionNote && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') ? (
          <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Resolution</p>
              <p className="whitespace-pre-wrap">{ticket.resolutionNote}</p>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="gap-4 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Conversation</h2>
        <TicketThread comments={comments} events={events} viewer="CUSTOMER" />
      </Card>

      <CustomerTicketActions
        number={ticket.number}
        status={ticket.status}
        closedAt={ticket.closedAt ? ticket.closedAt.toISOString() : null}
      />
    </div>
  )
}
