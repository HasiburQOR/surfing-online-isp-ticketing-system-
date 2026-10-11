'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TechItemData } from '@/lib/cms'
import {
  useFieldState,
  Field,
  ItemCard,
  ListEditorShell,
  EmptyState,
  apiFetch,
} from './_shared'

/* ------------------------------------------------------------------ */
/*  Existing row                                                      */
/* ------------------------------------------------------------------ */

function TechRow({ item, reload }: { item: TechItemData; reload: () => void }) {
  const [value, set, isDirty] = useFieldState<TechItemData>(item)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof TechItemData>(k: K, v: TechItemData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await apiFetch<{ techItem: TechItemData }>(
      `/api/cms/tech?id=${encodeURIComponent(value.id)}`,
      { method: 'PUT', body: JSON.stringify(value) },
    )
    setSaving(false)
    if (res.ok) {
      toast.success(`Tech item "${value.title}" updated`)
      reload()
    } else {
      toast.error(res.error || 'Failed to update tech item')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${value.title}"?`)) return
    setSaving(true)
    const res = await apiFetch(`/api/cms/tech?id=${encodeURIComponent(value.id)}`, {
      method: 'DELETE',
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Tech item "${value.title}" deleted`)
      reload()
    } else {
      toast.error(res.error || 'Failed to delete tech item')
    }
  }

  return (
    <ItemCard dirty={isDirty} onSave={handleSave} onDelete={handleDelete} saving={saving}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Title" htmlFor={`tech-title-${value.id}`} className="sm:col-span-2">
          <Input
            id={`tech-title-${value.id}`}
            value={value.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Fiber backbone"
          />
        </Field>
        <Field label="Icon name" htmlFor={`tech-icon-${value.id}`} hint="Wifi, Gauge, Phone, Mail, MapPin, Clock, Headphones, ShieldCheck, Cable, Router, Globe, Zap, Users, CheckCircle2, Server, Signal, Smartphone, CreditCard, Activity, Sparkles">
          <Input
            id={`tech-icon-${value.id}`}
            value={value.iconName}
            onChange={(e) => update('iconName', e.target.value)}
            placeholder="Cable"
          />
        </Field>
        <Field
          label="Description"
          htmlFor={`tech-desc-${value.id}`}
          className="sm:col-span-3"
        >
          <Textarea
            id={`tech-desc-${value.id}`}
            rows={3}
            value={value.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Describe this technology highlight…"
          />
        </Field>
        <Field label="Sort order" htmlFor={`tech-sort-${value.id}`}>
          <Input
            id={`tech-sort-${value.id}`}
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
      </div>
    </ItemCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Draft row                                                         */
/* ------------------------------------------------------------------ */

function emptyTech(sortOrder: number): TechItemData {
  return {
    id: `draft-${Date.now()}`,
    title: '',
    description: '',
    iconName: 'Cable',
    sortOrder,
  }
}

function NewTechRow({
  initial,
  onCreate,
  onCancel,
}: {
  initial: TechItemData
  onCreate: (data: TechItemData) => Promise<void>
  onCancel: () => void
}) {
  const [value, set, isDirty] = useFieldState<TechItemData>(initial)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof TechItemData>(k: K, v: TechItemData[K]) => {
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
        <Field label="Title" htmlFor="new-tech-title" className="sm:col-span-2">
          <Input
            id="new-tech-title"
            value={value.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Fiber backbone"
          />
        </Field>
        <Field label="Icon name" htmlFor="new-tech-icon">
          <Input
            id="new-tech-icon"
            value={value.iconName}
            onChange={(e) => update('iconName', e.target.value)}
            placeholder="Cable"
          />
        </Field>
        <Field label="Description" htmlFor="new-tech-desc" className="sm:col-span-3">
          <Textarea
            id="new-tech-desc"
            rows={3}
            value={value.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Describe this technology highlight…"
          />
        </Field>
        <Field label="Sort order" htmlFor="new-tech-sort">
          <Input
            id="new-tech-sort"
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
      </div>
    </ItemCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Editor                                                            */
/* ------------------------------------------------------------------ */

export function TechEditor({
  techItems,
  reload,
}: {
  techItems: TechItemData[]
  reload: () => void
}) {
  const [drafts, setDrafts] = React.useState<TechItemData[]>([])

  const addDraft = () => {
    const nextSort =
      techItems.length + drafts.length > 0
        ? Math.max(...techItems.map((p) => p.sortOrder), ...drafts.map((d) => d.sortOrder), 0) + 1
        : 0
    setDrafts((d) => [...d, emptyTech(nextSort)])
  }

  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id))

  const handleCreate = async (data: TechItemData) => {
    const { id: _id, ...rest } = data
    const res = await apiFetch<{ techItem: TechItemData }>('/api/cms/tech', {
      method: 'POST',
      body: JSON.stringify(rest),
    })
    if (res.ok) {
      toast.success(`Tech item "${data.title || 'Untitled'}" created`)
      removeDraft(data.id)
      reload()
    } else {
      toast.error(res.error || 'Failed to create tech item')
    }
  }

  return (
    <ListEditorShell
      title="Technology"
      count={techItems.length + drafts.length}
      onAdd={addDraft}
      addLabel="Add new"
    >
      {techItems.length === 0 && drafts.length === 0 ? (
        <EmptyState message='No technology items yet. Click "Add new" to create one.' />
      ) : null}

      {drafts.map((d) => (
        <NewTechRow
          key={d.id}
          initial={d}
          onCreate={handleCreate}
          onCancel={() => removeDraft(d.id)}
        />
      ))}

      {techItems.map((p) => (
        <TechRow key={p.id} item={p} reload={reload} />
      ))}
    </ListEditorShell>
  )
}
