'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { KeyRound, Loader2, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { apiFetch, EmptyState } from './_shared'

interface CustomerRow {
  id: string
  username: string
  fullName: string
  phone: string
  address: string
  area: string
  packageName: string
  isActive: boolean
  _count: { tickets: number }
}

interface Draft {
  username: string
  password: string
  fullName: string
  phone: string
  address: string
  area: string
  packageName: string
  isActive: boolean
}

const EMPTY: Draft = { username: '', password: '', fullName: '', phone: '', address: '', area: '', packageName: '', isActive: true }

function randomPassword(): string {
  // Easy to read out over the phone: no look-alike characters.
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(10))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

/* ------------------------------------------------------------------ */
/*  Manager                                                           */
/* ------------------------------------------------------------------ */

export function CustomersManager() {
  const [q, setQ] = React.useState('')
  const [debouncedQ, setDebouncedQ] = React.useState('')
  const [rows, setRows] = React.useState<CustomerRow[] | null>(null)
  const [editing, setEditing] = React.useState<string | 'new' | null>(null)
  const [version, setVersion] = React.useState(0)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  React.useEffect(() => {
    let cancelled = false
    apiFetch<CustomerRow[]>(`/api/admin/customers?q=${encodeURIComponent(debouncedQ)}`).then((r) => {
      if (cancelled) return
      if (r.ok && r.data) setRows(r.data)
      else {
        toast.error(r.error || 'Failed to load customers')
        setRows([])
      }
    })
    return () => {
      cancelled = true
    }
  }, [debouncedQ, version])

  const refresh = () => {
    setEditing(null)
    setVersion((n) => n + 1)
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Customers</h2>
          {rows ? (
            <Badge variant="secondary" className="rounded-full">
              {rows.length}
            </Badge>
          ) : null}
        </div>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> Add customer
        </Button>
      </header>
      <p className="text-sm text-muted-foreground">
        Customers log in at <span className="font-mono">/support</span> with the username and password you set here, then raise and track
        their own tickets.
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username or phone…" />
      </div>

      {editing === 'new' ? <CustomerCard key="new" initial={EMPTY} isNew onDone={refresh} onCancel={() => setEditing(null)} /> : null}

      {rows === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 && editing !== 'new' ? (
        <EmptyState message={q ? 'No customers match your search.' : 'No customers yet. Click "Add customer" to create the first login.'} />
      ) : (
        rows.map((c) =>
          editing === c.id ? (
            <CustomerCard
              key={c.id}
              id={c.id}
              ticketCount={c._count.tickets}
              initial={{ ...c, password: '' }}
              isNew={false}
              onDone={refresh}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <Card key={c.id} className="flex-row items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.fullName || c.username}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.username}</span>
                  {!c.isActive ? <Badge variant="outline">Disabled</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[c.phone, c.packageName, c.area].filter(Boolean).join(' · ') || '—'} · {c._count.tickets} ticket
                  {c._count.tickets === 1 ? '' : 's'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(c.id)}>
                Edit
              </Button>
            </Card>
          ),
        )
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  One customer card (edit or new)                                   */
/* ------------------------------------------------------------------ */

function CustomerCard({
  id,
  ticketCount = 0,
  initial,
  isNew,
  onDone,
  onCancel,
}: {
  id?: string
  ticketCount?: number
  initial: Draft
  isNew: boolean
  onDone: () => void
  onCancel: () => void
}) {
  const [v, setV] = React.useState<Draft>(initial)
  const [busy, setBusy] = React.useState(false)
  const [showPw, setShowPw] = React.useState(isNew)
  const set = <K extends keyof Draft>(k: K, val: Draft[K]) => setV((p) => ({ ...p, [k]: val }))

  async function save() {
    setBusy(true)
    const res = await apiFetch(id ? `/api/admin/customers?id=${encodeURIComponent(id)}` : '/api/admin/customers', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(v),
    })
    setBusy(false)
    if (res.ok) {
      toast.success(isNew ? `Customer ${v.username} created` : 'Customer updated')
      onDone()
    } else {
      toast.error(res.error || 'Save failed')
    }
  }

  async function remove() {
    if (!id || !confirm(`Delete customer ${v.username}? This cannot be undone.`)) return
    setBusy(true)
    const res = await apiFetch(`/api/admin/customers?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) {
      toast.success('Customer deleted')
      onDone()
    } else {
      toast.error(res.error || 'Delete failed')
    }
  }

  const field = (key: keyof Draft, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`c-${key}`}>{label}</Label>
      <Input
        id={`c-${key}`}
        value={v[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        {...props}
      />
    </div>
  )

  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        {isNew ? <Badge className="bg-accent text-accent-foreground">New customer</Badge> : <span className="text-sm font-medium">Editing {initial.username}</span>}
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel">
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field('username', 'Username / ID *', { autoCapitalize: 'none', spellCheck: false, placeholder: 'e.g. rahim123' })}
        {field('fullName', 'Full name')}
        {field('phone', 'Phone', { type: 'tel' })}
        {field('packageName', 'Package')}
        {field('address', 'Address')}
        {field('area', 'Area / district')}
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
        {showPw ? (
          <div className="space-y-1.5">
            <Label htmlFor="c-password">{isNew ? 'Password *' : 'New password'}</Label>
            <div className="flex gap-2">
              <Input
                id="c-password"
                value={v.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="off"
                placeholder="At least 6 characters"
                className="font-mono"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => set('password', randomPassword())}>
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isNew
                ? 'Give this password to the customer. It is stored encrypted, so you cannot view it again later - only reset it.'
                : 'Leave empty to keep the current password.'}
            </p>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowPw(true)}>
            <KeyRound className="size-4" /> Reset password
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch id="c-active" checked={v.isActive} onCheckedChange={(x) => set('isActive', x)} />
        <Label htmlFor="c-active">Account enabled (can log in)</Label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {!isNew ? (
          <Button variant="destructive" size="sm" disabled={busy || ticketCount > 0} onClick={remove} title={ticketCount > 0 ? 'Customers with tickets can only be disabled' : undefined}>
            <Trash2 className="size-4" /> Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={busy || !v.username.trim() || (isNew && v.password.length < 6)}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : isNew ? <Plus className="size-4" /> : <Save className="size-4" />}
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
