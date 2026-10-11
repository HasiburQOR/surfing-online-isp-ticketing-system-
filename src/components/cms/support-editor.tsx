'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { SupportChannelData } from '@/lib/cms'
import {
  useFieldState,
  Field,
  ItemCard,
  ListEditorShell,
  EmptyState,
  apiFetch,
} from './_shared'

function SupportRow({ item, reload }: { item: SupportChannelData; reload: () => void }) {
  const [value, set, isDirty] = useFieldState<SupportChannelData>(item)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof SupportChannelData>(k: K, v: SupportChannelData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await apiFetch<{ supportChannel: SupportChannelData }>(
      `/api/cms/support?id=${encodeURIComponent(value.id)}`,
      { method: 'PUT', body: JSON.stringify(value) },
    )
    setSaving(false)
    if (res.ok) {
      toast.success(`Channel "${value.title}" updated`)
      reload()
    } else {
      toast.error(res.error || 'Failed to update support channel')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${value.title}"?`)) return
    setSaving(true)
    const res = await apiFetch(`/api/cms/support?id=${encodeURIComponent(value.id)}`, {
      method: 'DELETE',
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Channel "${value.title}" deleted`)
      reload()
    } else {
      toast.error(res.error || 'Failed to delete support channel')
    }
  }

  return (
    <ItemCard dirty={isDirty} onSave={handleSave} onDelete={handleDelete} saving={saving}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Title" htmlFor={`sup-title-${value.id}`}>
          <Input
            id={`sup-title-${value.id}`}
            value={value.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Call us"
          />
        </Field>
        <Field label="Value" htmlFor={`sup-val-${value.id}`}>
          <Input
            id={`sup-val-${value.id}`}
            value={value.value}
            onChange={(e) => update('value', e.target.value)}
            placeholder="16XXX"
          />
        </Field>
        <Field label="Subtitle" htmlFor={`sup-sub-${value.id}`}>
          <Input
            id={`sup-sub-${value.id}`}
            value={value.subtitle}
            onChange={(e) => update('subtitle', e.target.value)}
            placeholder="24/7 hotline"
          />
        </Field>
        <Field label="Icon name" htmlFor={`sup-icon-${value.id}`} hint="Wifi, Gauge, Phone, Mail, MapPin, Clock, Headphones, ShieldCheck, Cable, Router, Globe, Zap, Users, CheckCircle2, Server, Signal, Smartphone, CreditCard, Activity, Sparkles">
          <Input
            id={`sup-icon-${value.id}`}
            value={value.iconName}
            onChange={(e) => update('iconName', e.target.value)}
            placeholder="Phone"
          />
        </Field>
        <Field label="Sort order" htmlFor={`sup-sort-${value.id}`}>
          <Input
            id={`sup-sort-${value.id}`}
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
      </div>
    </ItemCard>
  )
}

function emptySupport(sortOrder: number): SupportChannelData {
  return {
    id: `draft-${Date.now()}`,
    title: '',
    value: '',
    subtitle: '',
    iconName: 'Phone',
    sortOrder,
  }
}

function NewSupportRow({
  initial,
  onCreate,
  onCancel,
}: {
  initial: SupportChannelData
  onCreate: (data: SupportChannelData) => Promise<void>
  onCancel: () => void
}) {
  const [value, set, isDirty] = useFieldState<SupportChannelData>(initial)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof SupportChannelData>(k: K, v: SupportChannelData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleCreate = async () => {
    setSaving(true)
    await onCreate(value)
    setSaving(false)
  }

  return (
    <ItemCard dirty={isDirty || true} isNew saving={saving} onSave={handleCreate} onCancel={onCancel}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Title" htmlFor="new-sup-title">
          <Input
            id="new-sup-title"
            value={value.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Call us"
          />
        </Field>
        <Field label="Value" htmlFor="new-sup-val">
          <Input
            id="new-sup-val"
            value={value.value}
            onChange={(e) => update('value', e.target.value)}
            placeholder="16XXX"
          />
        </Field>
        <Field label="Subtitle" htmlFor="new-sup-sub">
          <Input
            id="new-sup-sub"
            value={value.subtitle}
            onChange={(e) => update('subtitle', e.target.value)}
            placeholder="24/7 hotline"
          />
        </Field>
        <Field label="Icon name" htmlFor="new-sup-icon">
          <Input
            id="new-sup-icon"
            value={value.iconName}
            onChange={(e) => update('iconName', e.target.value)}
            placeholder="Phone"
          />
        </Field>
        <Field label="Sort order" htmlFor="new-sup-sort">
          <Input
            id="new-sup-sort"
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
      </div>
    </ItemCard>
  )
}

export function SupportEditor({
  supportChannels,
  reload,
}: {
  supportChannels: SupportChannelData[]
  reload: () => void
}) {
  const [drafts, setDrafts] = React.useState<SupportChannelData[]>([])

  const addDraft = () => {
    const nextSort =
      supportChannels.length + drafts.length > 0
        ? Math.max(...supportChannels.map((p) => p.sortOrder), ...drafts.map((d) => d.sortOrder), 0) + 1
        : 0
    setDrafts((d) => [...d, emptySupport(nextSort)])
  }

  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id))

  const handleCreate = async (data: SupportChannelData) => {
    const { id: _id, ...rest } = data
    const res = await apiFetch<{ supportChannel: SupportChannelData }>('/api/cms/support', {
      method: 'POST',
      body: JSON.stringify(rest),
    })
    if (res.ok) {
      toast.success(`Channel "${data.title || 'Untitled'}" created`)
      removeDraft(data.id)
      reload()
    } else {
      toast.error(res.error || 'Failed to create support channel')
    }
  }

  return (
    <ListEditorShell
      title="Support"
      count={supportChannels.length + drafts.length}
      onAdd={addDraft}
      addLabel="Add new"
    >
      {supportChannels.length === 0 && drafts.length === 0 ? (
        <EmptyState message='No support channels yet. Click "Add new" to create one.' />
      ) : null}

      {drafts.map((d) => (
        <NewSupportRow
          key={d.id}
          initial={d}
          onCreate={handleCreate}
          onCancel={() => removeDraft(d.id)}
        />
      ))}

      {supportChannels.map((p) => (
        <SupportRow key={p.id} item={p} reload={reload} />
      ))}
    </ListEditorShell>
  )
}
