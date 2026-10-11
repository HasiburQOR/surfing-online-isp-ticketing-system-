'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, MapPin, MessageSquare, Package, Phone, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { fmtDateTime, nativeSelectClass } from '@/components/ticketing/ticket-ui'
import { apiFetch, EmptyState } from './_shared'

interface Lead {
  id: string
  name: string
  phone: string
  address: string
  area: string
  packageInterest: string
  message: string
  status: string
  notes: string
  createdAt: string
}

const STATUSES: { id: string; label: string; style: string }[] = [
  { id: 'NEW', label: 'New', style: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'CONTACTED', label: 'Contacted', style: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'SCHEDULED', label: 'Install scheduled', style: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'CONNECTED', label: 'Connected', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'REJECTED', label: 'Not proceeding', style: 'bg-slate-200 text-slate-700 border-slate-300' },
]

export function LeadsManager({ onChanged }: { onChanged: () => void }) {
  const [leads, setLeads] = React.useState<Lead[] | null>(null)
  const [filter, setFilter] = React.useState('NEW')

  const load = React.useCallback(async () => {
    const res = await apiFetch<Lead[]>('/api/admin/leads')
    if (res.ok && res.data) setLeads(res.data)
    else {
      toast.error(res.error || 'Failed to load requests')
      setLeads([])
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const count = (s: string) => (leads ?? []).filter((l) => (s === '' ? true : l.status === s)).length
  const shown = (leads ?? []).filter((l) => (filter === '' ? true : l.status === filter))

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Connection Requests</h2>
        <p className="text-sm text-muted-foreground">
          People who filled in &ldquo;Request a New Connection&rdquo; on the website. Call them back, then update the status.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {[{ id: '', label: 'All' }, ...STATUSES].map((s) => (
          <button
            key={s.id || 'all'}
            type="button"
            onClick={() => setFilter(s.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === s.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted',
            )}
          >
            {s.label} <span className="opacity-70">{count(s.id)}</span>
          </button>
        ))}
      </div>

      {leads === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState message={filter === 'NEW' ? 'No new requests. 🎉' : 'Nothing here.'} />
      ) : (
        shown.map((l) => (
          <LeadCard
            key={l.id}
            lead={l}
            onChanged={() => {
              load()
              onChanged()
            }}
          />
        ))
      )}
    </section>
  )
}

function LeadCard({ lead, onChanged }: { lead: Lead; onChanged: () => void }) {
  const [status, setStatus] = React.useState(lead.status)
  const [notes, setNotes] = React.useState(lead.notes)
  const [busy, setBusy] = React.useState(false)
  const dirty = status !== lead.status || notes !== lead.notes
  const meta = STATUSES.find((s) => s.id === lead.status) ?? STATUSES[0]

  async function save() {
    setBusy(true)
    const res = await apiFetch(`/api/admin/leads?id=${encodeURIComponent(lead.id)}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    })
    setBusy(false)
    if (res.ok) {
      toast.success('Request updated')
      onChanged()
    } else toast.error(res.error || 'Update failed')
  }

  async function remove() {
    if (!confirm(`Delete the request from ${lead.name}?`)) return
    setBusy(true)
    const res = await apiFetch(`/api/admin/leads?id=${encodeURIComponent(lead.id)}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) {
      toast.success('Request deleted')
      onChanged()
    } else toast.error(res.error || 'Delete failed')
  }

  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold">{lead.name}</p>
          <p className="text-xs text-muted-foreground">Received {fmtDateTime(lead.createdAt)}</p>
        </div>
        <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', meta.style)}>{meta.label}</span>
      </div>

      <div className="grid gap-1.5 text-sm sm:grid-cols-2">
        <a href={`tel:${lead.phone}`} className="flex items-center gap-2 font-medium text-primary hover:underline">
          <Phone className="size-4 shrink-0" /> {lead.phone}
        </a>
        {lead.address || lead.area ? (
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-muted-foreground" /> {[lead.address, lead.area].filter(Boolean).join(', ')}
          </p>
        ) : null}
        {lead.packageInterest ? (
          <p className="flex items-center gap-2">
            <Package className="size-4 shrink-0 text-muted-foreground" /> {lead.packageInterest}
          </p>
        ) : null}
        {lead.message ? (
          <p className="flex items-start gap-2 sm:col-span-2">
            <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="whitespace-pre-wrap">{lead.message}</span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-[200px_1fr]">
        <select className={nativeSelectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <Textarea
          rows={2}
          value={notes}
          maxLength={2000}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes (e.g. called at 3pm, install Friday)…"
        />
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={remove}>
          <Trash2 className="size-4" /> Delete
        </Button>
        <Button size="sm" disabled={busy || !dirty} onClick={save}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
        </Button>
      </div>
    </Card>
  )
}
