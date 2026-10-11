'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { StatData } from '@/lib/cms'
import {
  useFieldState,
  Field,
  ItemCard,
  ListEditorShell,
  EmptyState,
  apiFetch,
} from './_shared'

function StatRow({ item, reload }: { item: StatData; reload: () => void }) {
  const [value, set, isDirty] = useFieldState<StatData>(item)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof StatData>(k: K, v: StatData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await apiFetch<{ stat: StatData }>(
      `/api/cms/stats?id=${encodeURIComponent(value.id)}`,
      { method: 'PUT', body: JSON.stringify(value) },
    )
    setSaving(false)
    if (res.ok) {
      toast.success(`Stat "${value.label}" updated`)
      reload()
    } else {
      toast.error(res.error || 'Failed to update stat')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${value.label}"?`)) return
    setSaving(true)
    const res = await apiFetch(`/api/cms/stats?id=${encodeURIComponent(value.id)}`, {
      method: 'DELETE',
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Stat "${value.label}" deleted`)
      reload()
    } else {
      toast.error(res.error || 'Failed to delete stat')
    }
  }

  return (
    <ItemCard dirty={isDirty} onSave={handleSave} onDelete={handleDelete} saving={saving}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Label" htmlFor={`stat-label-${value.id}`}>
          <Input
            id={`stat-label-${value.id}`}
            value={value.label}
            onChange={(e) => update('label', e.target.value)}
            placeholder="Happy customers"
          />
        </Field>
        <Field label="Value" htmlFor={`stat-val-${value.id}`}>
          <Input
            id={`stat-val-${value.id}`}
            value={value.value}
            onChange={(e) => update('value', e.target.value)}
            placeholder="12,000+"
          />
        </Field>
        <Field label="Icon name" htmlFor={`stat-icon-${value.id}`} hint="Wifi, Gauge, Phone, Mail, MapPin, Clock, Headphones, ShieldCheck, Cable, Router, Globe, Zap, Users, CheckCircle2, Server, Signal, Smartphone, CreditCard, Activity, Sparkles">
          <Input
            id={`stat-icon-${value.id}`}
            value={value.iconName}
            onChange={(e) => update('iconName', e.target.value)}
            placeholder="Users"
          />
        </Field>
        <Field label="Sort order" htmlFor={`stat-sort-${value.id}`}>
          <Input
            id={`stat-sort-${value.id}`}
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
      </div>
    </ItemCard>
  )
}

function emptyStat(sortOrder: number): StatData {
  return {
    id: `draft-${Date.now()}`,
    label: '',
    value: '',
    iconName: 'Users',
    sortOrder,
  }
}

function NewStatRow({
  initial,
  onCreate,
  onCancel,
}: {
  initial: StatData
  onCreate: (data: StatData) => Promise<void>
  onCancel: () => void
}) {
  const [value, set, isDirty] = useFieldState<StatData>(initial)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof StatData>(k: K, v: StatData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleCreate = async () => {
    setSaving(true)
    await onCreate(value)
    setSaving(false)
  }

  return (
    <ItemCard dirty={isDirty || true} isNew saving={saving} onSave={handleCreate} onCancel={onCancel}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Label" htmlFor="new-stat-label">
          <Input
            id="new-stat-label"
            value={value.label}
            onChange={(e) => update('label', e.target.value)}
            placeholder="Happy customers"
          />
        </Field>
        <Field label="Value" htmlFor="new-stat-val">
          <Input
            id="new-stat-val"
            value={value.value}
            onChange={(e) => update('value', e.target.value)}
            placeholder="12,000+"
          />
        </Field>
        <Field label="Icon name" htmlFor="new-stat-icon">
          <Input
            id="new-stat-icon"
            value={value.iconName}
            onChange={(e) => update('iconName', e.target.value)}
            placeholder="Users"
          />
        </Field>
        <Field label="Sort order" htmlFor="new-stat-sort">
          <Input
            id="new-stat-sort"
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
      </div>
    </ItemCard>
  )
}

export function StatsEditor({
  stats,
  reload,
}: {
  stats: StatData[]
  reload: () => void
}) {
  const [drafts, setDrafts] = React.useState<StatData[]>([])

  const addDraft = () => {
    const nextSort =
      stats.length + drafts.length > 0
        ? Math.max(...stats.map((p) => p.sortOrder), ...drafts.map((d) => d.sortOrder), 0) + 1
        : 0
    setDrafts((d) => [...d, emptyStat(nextSort)])
  }

  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id))

  const handleCreate = async (data: StatData) => {
    const { id: _id, ...rest } = data
    const res = await apiFetch<{ stat: StatData }>('/api/cms/stats', {
      method: 'POST',
      body: JSON.stringify(rest),
    })
    if (res.ok) {
      toast.success(`Stat "${data.label || 'Untitled'}" created`)
      removeDraft(data.id)
      reload()
    } else {
      toast.error(res.error || 'Failed to create stat')
    }
  }

  return (
    <ListEditorShell
      title="Stats"
      count={stats.length + drafts.length}
      onAdd={addDraft}
      addLabel="Add new"
    >
      {stats.length === 0 && drafts.length === 0 ? (
        <EmptyState message='No stats yet. Click "Add new" to create one.' />
      ) : null}

      {drafts.map((d) => (
        <NewStatRow
          key={d.id}
          initial={d}
          onCreate={handleCreate}
          onCancel={() => removeDraft(d.id)}
        />
      ))}

      {stats.map((p) => (
        <StatRow key={p.id} item={p} reload={reload} />
      ))}
    </ListEditorShell>
  )
}
