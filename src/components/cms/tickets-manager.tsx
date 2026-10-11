'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Loader2, Plus, RotateCcw, Search, Send, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  CHANNELS,
  CHANNEL_LABELS,
  PRIORITIES,
  STATUS_LABELS,
  allowedTransitions,
} from '@/lib/ticket-constants'
import { PriorityBadge, StatusBadge, fmtDateTime, nativeSelectClass } from '@/components/ticketing/ticket-ui'
import { TicketThread, type ThreadComment, type ThreadEvent } from '@/components/ticketing/ticket-thread'
import { apiFetch, EmptyState } from './_shared'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ListTicket {
  id: string
  number: string
  subject: string
  status: string
  priority: string
  updatedAt: string
  customer: { username: string; fullName: string; phone: string }
  category: { nameEn: string }
}

interface TicketDetail {
  id: string
  number: string
  subject: string
  description: string
  status: string
  priority: string
  channel: string
  createdByType: string
  resolutionNote: string
  closedByType: string
  reopenCount: number
  createdAt: string
  closedAt: string | null
  customer: { id: string; username: string; fullName: string; phone: string; address: string; area: string; packageName: string }
  category: { nameEn: string }
  comments: ThreadComment[]
  events: ThreadEvent[]
}

const FILTERS: { id: string; label: string }[] = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'OPEN', label: 'Open' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'WAITING_CUSTOMER', label: 'Waiting' },
  { id: 'RESOLVED', label: 'Resolved' },
  { id: 'REOPENED', label: 'Reopened' },
  { id: 'CLOSED', label: 'Closed' },
  { id: '', label: 'All' },
]

type View = { name: 'list' } | { name: 'new' } | { name: 'detail'; number: string }

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

export function TicketsManager({ onChanged }: { onChanged: () => void }) {
  const [view, setView] = React.useState<View>({ name: 'list' })

  if (view.name === 'new') {
    return (
      <NewTicketView
        onCancel={() => setView({ name: 'list' })}
        onCreated={(number) => {
          onChanged()
          setView({ name: 'detail', number })
        }}
      />
    )
  }
  if (view.name === 'detail') {
    return <TicketDetailView number={view.number} onBack={() => setView({ name: 'list' })} onChanged={onChanged} />
  }
  return <TicketList onOpen={(number) => setView({ name: 'detail', number })} onNew={() => setView({ name: 'new' })} />
}

/* ------------------------------------------------------------------ */
/*  List                                                              */
/* ------------------------------------------------------------------ */

function TicketList({ onOpen, onNew }: { onOpen: (n: string) => void; onNew: () => void }) {
  const [filter, setFilter] = React.useState('ACTIVE')
  const [q, setQ] = React.useState('')
  const [debouncedQ, setDebouncedQ] = React.useState('')
  const [tickets, setTickets] = React.useState<ListTicket[] | null>(null)
  const [counts, setCounts] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  React.useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (filter) params.set('status', filter)
    if (debouncedQ) params.set('q', debouncedQ)
    apiFetch<{ tickets: ListTicket[]; counts: Record<string, number> }>(`/api/admin/tickets?${params}`).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) {
        setTickets(res.data.tickets)
        setCounts(res.data.counts)
      } else {
        toast.error(res.error || 'Failed to load tickets')
        setTickets([])
      }
    })
    return () => {
      cancelled = true
    }
  }, [filter, debouncedQ])

  const countFor = (id: string) =>
    id === 'ACTIVE'
      ? Object.entries(counts).reduce((n, [s, c]) => (s === 'CLOSED' ? n : n + c), 0)
      : id === ''
        ? Object.values(counts).reduce((n, c) => n + c, 0)
        : counts[id] || 0

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Support Tickets</h2>
        <Button size="sm" onClick={onNew}>
          <Plus className="size-4" /> New ticket
        </Button>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id || 'all'}
            type="button"
            onClick={() => {
              setTickets(null)
              setFilter(f.id)
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === f.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted',
            )}
          >
            {f.label} <span className="opacity-70">{countFor(f.id)}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          value={q}
          onChange={(e) => {
            setTickets(null)
            setQ(e.target.value)
          }}
          placeholder="Search by ticket number, subject, customer name, username or phone…"
        />
      </div>

      {tickets === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState message="No tickets match." />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button key={t.id} type="button" onClick={() => onOpen(t.number)} className="block w-full text-left">
              <Card className="gap-1.5 p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{t.number}</span>
                  <StatusBadge status={t.status} />
                  {t.priority !== 'NORMAL' ? <PriorityBadge priority={t.priority} /> : null}
                </div>
                <p className="truncate font-medium">{t.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {t.customer.fullName || t.customer.username} ({t.customer.username})
                  {t.customer.phone ? ` · ${t.customer.phone}` : ''} · {t.category.nameEn} · {fmtDateTime(t.updatedAt)}
                </p>
              </Card>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail                                                            */
/* ------------------------------------------------------------------ */

type Panel = null | 'resolve' | 'close' | 'reopen'

function TicketDetailView({ number, onBack, onChanged }: { number: string; onBack: () => void; onChanged: () => void }) {
  const [ticket, setTicket] = React.useState<TicketDetail | null>(null)
  const [loadError, setLoadError] = React.useState('')
  const [reply, setReply] = React.useState('')
  const [internal, setInternal] = React.useState(false)
  const [panel, setPanel] = React.useState<Panel>(null)
  const [panelText, setPanelText] = React.useState('')
  const [nextStatus, setNextStatus] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    const res = await apiFetch<TicketDetail>(`/api/admin/tickets/${encodeURIComponent(number)}`)
    if (res.ok && res.data) setTicket(res.data)
    else setLoadError(res.error || 'Failed to load ticket')
  }, [number])

  React.useEffect(() => {
    load()
  }, [load])

  async function act(payload: Record<string, unknown>, success: string) {
    setBusy(true)
    const res = await apiFetch(`/api/admin/tickets/${encodeURIComponent(number)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setBusy(false)
    if (res.ok) {
      toast.success(success)
      if (payload.action === 'comment') setReply('')
      setPanel(null)
      setPanelText('')
      setNextStatus('')
      await load()
      onChanged()
    } else {
      toast.error(res.error || 'Action failed')
    }
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <BackButton onBack={onBack} />
        <EmptyState message={loadError} />
      </div>
    )
  }
  if (!ticket) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isClosed = ticket.status === 'CLOSED'
  const moves = allowedTransitions(ticket.status).filter((s) => s !== 'CLOSED' && s !== 'RESOLVED' && s !== 'REOPENED')
  const c = ticket.customer

  return (
    <section className="space-y-4">
      <BackButton onBack={onBack} />

      <Card className="gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{ticket.number}</span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {ticket.reopenCount > 0 ? <span className="text-xs text-muted-foreground">reopened ×{ticket.reopenCount}</span> : null}
        </div>
        <h2 className="text-lg font-semibold sm:text-xl">{ticket.subject}</h2>
        <p className="text-xs text-muted-foreground">
          {ticket.category.nameEn} · via {CHANNEL_LABELS[ticket.channel] ?? ticket.channel} · opened {fmtDateTime(ticket.createdAt)}
          {ticket.createdByType === 'ADMIN' ? ' · created by admin' : ' · created by customer'}
          {ticket.closedAt ? ` · closed ${fmtDateTime(ticket.closedAt)} by ${ticket.closedByType === 'ADMIN' ? 'admin' : 'customer'}` : ''}
        </p>

        <div className="grid gap-3 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium">{c.fullName || c.username}</p>
            <p className="text-xs text-muted-foreground">ID: {c.username}</p>
            {c.packageName ? <p className="text-xs text-muted-foreground">Package: {c.packageName}</p> : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {c.phone ? <p>📞 {c.phone}</p> : null}
            {c.address || c.area ? <p>📍 {[c.address, c.area].filter(Boolean).join(', ')}</p> : null}
          </div>
        </div>

        {ticket.description ? <p className="whitespace-pre-wrap text-sm">{ticket.description}</p> : null}
        {ticket.resolutionNote ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p className="font-semibold">Resolution</p>
            <p className="whitespace-pre-wrap">{ticket.resolutionNote}</p>
          </div>
        ) : null}
      </Card>

      <Card className="gap-4 p-4 sm:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Conversation</h3>
        <TicketThread comments={ticket.comments} events={ticket.events} viewer="ADMIN" />
      </Card>

      {!isClosed ? (
        <Card className="gap-3 p-4 sm:p-5">
          <Label htmlFor="admin-reply">Reply</Label>
          <Textarea
            id="admin-reply"
            rows={3}
            maxLength={5000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={internal ? 'Internal note - the customer will NOT see this' : 'Message to the customer…'}
            className={internal ? 'border-amber-300 bg-amber-50' : undefined}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch id="internal" checked={internal} onCheckedChange={setInternal} />
              <Label htmlFor="internal" className="text-sm">
                Internal note (hidden from customer)
              </Label>
            </div>
            <Button
              size="sm"
              disabled={busy || !reply.trim()}
              onClick={() => act({ action: 'comment', body: reply, isInternal: internal }, internal ? 'Internal note added' : 'Reply sent')}
            >
              {busy && panel === null ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {internal ? 'Add note' : 'Send reply'}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="gap-4 p-4 sm:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Manage</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {!isClosed && moves.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="move-status">Change status</Label>
              <div className="flex gap-2">
                <select id="move-status" className={nativeSelectClass} value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                  <option value="">Select…</option>
                  {moves.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !nextStatus}
                  onClick={() => act({ action: 'status', to: nextStatus }, `Status changed to ${STATUS_LABELS[nextStatus]}`)}
                >
                  Apply
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              className={nativeSelectClass}
              value={ticket.priority}
              disabled={busy}
              onChange={(e) => act({ action: 'priority', priority: e.target.value }, 'Priority updated')}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {!isClosed && ticket.status !== 'RESOLVED' ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setPanel(panel === 'resolve' ? null : 'resolve')}>
              <CheckCircle2 className="size-4" /> Mark resolved
            </Button>
          ) : null}
          {!isClosed ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setPanel(panel === 'close' ? null : 'close')}>
              <XCircle className="size-4" /> Close ticket
            </Button>
          ) : null}
          {isClosed || ticket.status === 'RESOLVED' ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setPanel(panel === 'reopen' ? null : 'reopen')}>
              <RotateCcw className="size-4" /> Reopen
            </Button>
          ) : null}
        </div>

        {panel ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
            <Label htmlFor="panel-text">
              {panel === 'resolve'
                ? 'How was it resolved? (shown to the customer)'
                : panel === 'close'
                  ? 'Closing note (optional)'
                  : 'Reason for reopening'}
            </Label>
            <Textarea id="panel-text" rows={3} value={panelText} onChange={(e) => setPanelText(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPanel(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={busy || (panel !== 'close' && !panelText.trim())}
                onClick={() =>
                  panel === 'resolve'
                    ? act({ action: 'resolve', note: panelText }, 'Ticket marked resolved')
                    : panel === 'close'
                      ? act({ action: 'close', note: panelText }, 'Ticket closed')
                      : act({ action: 'reopen', reason: panelText }, 'Ticket reopened')
                }
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {panel === 'resolve' ? 'Mark resolved' : panel === 'close' ? 'Close ticket' : 'Reopen ticket'}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
      <ArrowLeft className="size-4" /> All tickets
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/*  New ticket (on behalf of a customer)                              */
/* ------------------------------------------------------------------ */

interface CustomerOption {
  id: string
  username: string
  fullName: string
  phone: string
  isActive: boolean
}

function NewTicketView({ onCancel, onCreated }: { onCancel: () => void; onCreated: (number: string) => void }) {
  const [q, setQ] = React.useState('')
  const [options, setOptions] = React.useState<CustomerOption[]>([])
  const [customer, setCustomer] = React.useState<CustomerOption | null>(null)
  const [categories, setCategories] = React.useState<{ id: string; nameEn: string; isActive: boolean }[]>([])
  const [categoryId, setCategoryId] = React.useState('')
  const [subject, setSubject] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [priority, setPriority] = React.useState('NORMAL')
  const [channel, setChannel] = React.useState('PHONE')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    apiFetch<{ id: string; nameEn: string; isActive: boolean }[]>('/api/admin/categories').then((r) => {
      if (r.ok && r.data) setCategories(r.data.filter((c) => c.isActive))
    })
  }, [])

  React.useEffect(() => {
    if (customer || q.trim().length < 2) {
      setOptions([])
      return
    }
    const t = setTimeout(() => {
      apiFetch<CustomerOption[]>(`/api/admin/customers?q=${encodeURIComponent(q.trim())}`).then((r) => {
        if (r.ok && r.data) setOptions(r.data.filter((c) => c.isActive).slice(0, 8))
      })
    }, 250)
    return () => clearTimeout(t)
  }, [q, customer])

  async function create() {
    if (!customer) return
    setBusy(true)
    const res = await apiFetch<{ number: string }>('/api/admin/tickets', {
      method: 'POST',
      body: JSON.stringify({ customerId: customer.id, categoryId, subject, description, priority, channel }),
    })
    setBusy(false)
    if (res.ok && res.data) {
      toast.success(`Ticket ${res.data.number} created`)
      onCreated(res.data.number)
    } else {
      toast.error(res.error || 'Could not create ticket')
    }
  }

  return (
    <section className="space-y-4">
      <BackButton onBack={onCancel} />
      <Card className="gap-4 p-4 sm:p-5">
        <h2 className="text-xl font-semibold">New ticket for a customer</h2>

        <div className="space-y-1.5">
          <Label>Customer</Label>
          {customer ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{customer.fullName || customer.username}</span>{' '}
                <span className="text-muted-foreground">({customer.username}){customer.phone ? ` · ${customer.phone}` : ''}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => { setCustomer(null); setQ('') }}>
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username or phone (min 2 characters)…" autoFocus />
              {options.length > 0 ? (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
                  {options.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => setCustomer(o)}
                      >
                        <span className="font-medium">{o.fullName || o.username}</span>
                        <span className="text-xs text-muted-foreground">{o.username}{o.phone ? ` · ${o.phone}` : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="n-cat">Category</Label>
            <select id="n-cat" className={nativeSelectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-pri">Priority</Label>
            <select id="n-pri" className={nativeSelectClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-chan">How did they contact us?</Label>
            <select id="n-chan" className={nativeSelectClass} value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="n-sub">Subject</Label>
          <Input id="n-sub" maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n-desc">Details</Label>
          <Textarea id="n-desc" rows={5} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={busy || !customer || !categoryId || !subject.trim()} onClick={create}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create ticket
          </Button>
        </div>
      </Card>
    </section>
  )
}
