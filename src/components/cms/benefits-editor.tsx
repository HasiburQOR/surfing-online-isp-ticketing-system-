'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BenefitData } from '@/lib/cms'
import {
  useFieldState,
  Field,
  ItemCard,
  ListEditorShell,
  EmptyState,
  apiFetch,
} from './_shared'

function BenefitRow({ item, reload }: { item: BenefitData; reload: () => void }) {
  const [value, set, isDirty] = useFieldState<BenefitData>(item)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof BenefitData>(k: K, v: BenefitData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await apiFetch<{ benefit: BenefitData }>(
      `/api/cms/benefits?id=${encodeURIComponent(value.id)}`,
      { method: 'PUT', body: JSON.stringify(value) },
    )
    setSaving(false)
    if (res.ok) {
      toast.success(`Benefit "${value.title}" updated`)
      reload()
    } else {
      toast.error(res.error || 'Failed to update benefit')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${value.title}"?`)) return
    setSaving(true)
    const res = await apiFetch(`/api/cms/benefits?id=${encodeURIComponent(value.id)}`, {
      method: 'DELETE',
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Benefit "${value.title}" deleted`)
      reload()
    } else {
      toast.error(res.error || 'Failed to delete benefit')
    }
  }

  return (
    <ItemCard dirty={isDirty} onSave={handleSave} onDelete={handleDelete} saving={saving}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Title" htmlFor={`ben-title-${value.id}`} className="sm:col-span-2">
          <Input
            id={`ben-title-${value.id}`}
            value={value.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Truly unlimited"
          />
        </Field>
        <Field label="Icon name" htmlFor={`ben-icon-${value.id}`} hint="Wifi, Gauge, Phone, Mail, MapPin, Clock, Headphones, ShieldCheck, Cable, Router, Globe, Zap, Users, CheckCircle2, Server, Signal, Smartphone, CreditCard, Activity, Sparkles">
          <Input
            id={`ben-icon-${value.id}`}
            value={value.iconName}
            onChange={(e) => update('iconName', e.target.value)}
            placeholder="Zap"
          />
        </Field>
        <Field label="Description" htmlFor={`ben-desc-${value.id}`} className="sm:col-span-3">
          <Textarea
            id={`ben-desc-${value.id}`}
            rows={3}
            value={value.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Explain this benefit…"
          />
        </Field>
        <Field label="Sort order" htmlFor={`ben-sort-${value.id}`}>
          <Input
            id={`ben-sort-${value.id}`}
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
      </div>
    </ItemCard>
  )
}

function emptyBenefit(sortOrder: number): BenefitData {
  return {
    id: `draft-${Date.now()}`,
    title: '',
    description: '',
    iconName: 'Zap',
    sortOrder,
  }
}

function NewBenefitRow({
  initial,
  onCreate,
  onCancel,
}: {
  initial: BenefitData
  onCreate: (data: BenefitData) => Promise<void>
  onCancel: () => void
}) {
  const [value, set, isDirty] = useFieldState<BenefitData>(initial)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof BenefitData>(k: K, v: BenefitData[K]) => {
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
        <Field label="Title" htmlFor="new-ben-title" className="sm:col-span-2">
          <Input
            id="new-ben-title"
            value={value.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Truly unlimited"
          />
        </Field>
        <Field label="Icon name" htmlFor="new-ben-icon">
          <Input
            id="new-ben-icon"
            value={value.iconName}
            onChange={(e) => update('iconName', e.target.value)}
            placeholder="Zap"
          />
        </Field>
        <Field label="Description" htmlFor="new-ben-desc" className="sm:col-span-3">
          <Textarea
            id="new-ben-desc"
            rows={3}
            value={value.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Explain this benefit…"
          />
        </Field>
        <Field label="Sort order" htmlFor="new-ben-sort">
          <Input
            id="new-ben-sort"
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
      </div>
    </ItemCard>
  )
}

export function BenefitsEditor({
  benefits,
  reload,
}: {
  benefits: BenefitData[]
  reload: () => void
}) {
  const [drafts, setDrafts] = React.useState<BenefitData[]>([])

  const addDraft = () => {
    const nextSort =
      benefits.length + drafts.length > 0
        ? Math.max(...benefits.map((p) => p.sortOrder), ...drafts.map((d) => d.sortOrder), 0) + 1
        : 0
    setDrafts((d) => [...d, emptyBenefit(nextSort)])
  }

  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id))

  const handleCreate = async (data: BenefitData) => {
    const { id: _id, ...rest } = data
    const res = await apiFetch<{ benefit: BenefitData }>('/api/cms/benefits', {
      method: 'POST',
      body: JSON.stringify(rest),
    })
    if (res.ok) {
      toast.success(`Benefit "${data.title || 'Untitled'}" created`)
      removeDraft(data.id)
      reload()
    } else {
      toast.error(res.error || 'Failed to create benefit')
    }
  }

  return (
    <ListEditorShell
      title="Benefits"
      count={benefits.length + drafts.length}
      onAdd={addDraft}
      addLabel="Add new"
    >
      {benefits.length === 0 && drafts.length === 0 ? (
        <EmptyState message='No benefits yet. Click "Add new" to create one.' />
      ) : null}

      {drafts.map((d) => (
        <NewBenefitRow
          key={d.id}
          initial={d}
          onCreate={handleCreate}
          onCancel={() => removeDraft(d.id)}
        />
      ))}

      {benefits.map((p) => (
        <BenefitRow key={p.id} item={p} reload={reload} />
      ))}
    </ListEditorShell>
  )
}
