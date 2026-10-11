'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { PackageData } from '@/lib/cms'
import {
  useFieldState,
  Field,
  ItemCard,
  ListEditorShell,
  EmptyState,
  apiFetch,
  slugify,
} from './_shared'

/* ------------------------------------------------------------------ */
/*  PackageRow — existing item                                        */
/* ------------------------------------------------------------------ */

function PackageRow({
  item,
  reload,
}: {
  item: PackageData
  reload: () => void
}) {
  const [value, set, isDirty, reset] = useFieldState<PackageData>(item)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof PackageData>(k: K, v: PackageData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await apiFetch<{ package: PackageData }>(
      `/api/cms/packages?id=${encodeURIComponent(value.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(value),
      },
    )
    setSaving(false)
    if (res.ok) {
      toast.success(`Package "${value.name}" updated`)
      reload()
    } else {
      toast.error(res.error || 'Failed to update package')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete package "${value.name}"? This cannot be undone.`)) return
    setSaving(true)
    const res = await apiFetch(
      `/api/cms/packages?id=${encodeURIComponent(value.id)}`,
      { method: 'DELETE' },
    )
    setSaving(false)
    if (res.ok) {
      toast.success(`Package "${value.name}" deleted`)
      reload()
    } else {
      toast.error(res.error || 'Failed to delete package')
    }
  }

  return (
    <ItemCard
      dirty={isDirty}
      onSave={handleSave}
      onDelete={handleDelete}
      saving={saving}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`pkg-name-${value.id}`}>
          <Input
            id={`pkg-name-${value.id}`}
            value={value.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Home Basic"
          />
        </Field>
        <Field label="Tag" htmlFor={`pkg-tag-${value.id}`}>
          <Input
            id={`pkg-tag-${value.id}`}
            value={value.tag}
            onChange={(e) => update('tag', e.target.value)}
            placeholder="Home"
          />
        </Field>
        <Field label="Speed (Mbps)" htmlFor={`pkg-speed-${value.id}`}>
          <Input
            id={`pkg-speed-${value.id}`}
            type="number"
            value={value.speedMbps}
            onChange={(e) => update('speedMbps', Number(e.target.value))}
            placeholder="20"
          />
        </Field>
        <Field label="Price (BDT)" htmlFor={`pkg-price-${value.id}`}>
          <Input
            id={`pkg-price-${value.id}`}
            type="number"
            value={value.priceBdt}
            onChange={(e) => update('priceBdt', Number(e.target.value))}
            placeholder="599"
          />
        </Field>
        <Field label="Period" htmlFor={`pkg-period-${value.id}`}>
          <Input
            id={`pkg-period-${value.id}`}
            value={value.period}
            onChange={(e) => update('period', e.target.value)}
            placeholder="/month"
          />
        </Field>
        <Field label="Sort order" htmlFor={`pkg-sort-${value.id}`}>
          <Input
            id={`pkg-sort-${value.id}`}
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
            placeholder="0"
          />
        </Field>
        <Field
          label="Features (one per line)"
          htmlFor={`pkg-features-${value.id}`}
          className="sm:col-span-2"
        >
          <Textarea
            id={`pkg-features-${value.id}`}
            rows={4}
            value={value.features.join('\n')}
            onChange={(e) =>
              update(
                'features',
                e.target.value.split('\n').map((s) => s),
              )
            }
            placeholder={'Unlimited data\nFree router\n24/7 support'}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-1">
        <div className="flex items-center gap-2">
          <Switch
            id={`pkg-popular-${value.id}`}
            checked={value.isPopular}
            onCheckedChange={(v) => update('isPopular', v)}
          />
          <Label htmlFor={`pkg-popular-${value.id}`}>Mark as popular</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={`pkg-public-${value.id}`}
            checked={value.isPublic}
            onCheckedChange={(v) => update('isPublic', v)}
          />
          <Label htmlFor={`pkg-public-${value.id}`}>Visible publicly</Label>
        </div>
      </div>
    </ItemCard>
  )
}

/* ------------------------------------------------------------------ */
/*  NewPackageDraft                                                   */
/* ------------------------------------------------------------------ */

function emptyPackage(sortOrder: number): PackageData {
  return {
    id: `draft-${Date.now()}`,
    name: '',
    tag: 'Home',
    speedMbps: 0,
    priceBdt: 0,
    period: '/month',
    isPopular: false,
    isPublic: true,
    features: [],
    sortOrder,
  }
}

function NewPackageDraft({
  initial,
  onCreate,
  onCancel,
}: {
  initial: PackageData
  onCreate: (data: PackageData) => Promise<void>
  onCancel: () => void
}) {
  const [value, set, isDirty] = useFieldState<PackageData>(initial)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof PackageData>(k: K, v: PackageData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleCreate = async () => {
    setSaving(true)
    await onCreate(value)
    setSaving(false)
  }

  return (
    <ItemCard
      dirty={isDirty || true}
      isNew
      saving={saving}
      onSave={handleCreate}
      onCancel={onCancel}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`new-pkg-name`}>
          <Input
            id="new-pkg-name"
            value={value.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Home Basic"
          />
        </Field>
        <Field label="Tag" htmlFor="new-pkg-tag">
          <Input
            id="new-pkg-tag"
            value={value.tag}
            onChange={(e) => update('tag', e.target.value)}
            placeholder="Home"
          />
        </Field>
        <Field label="Speed (Mbps)" htmlFor="new-pkg-speed">
          <Input
            id="new-pkg-speed"
            type="number"
            value={value.speedMbps}
            onChange={(e) => update('speedMbps', Number(e.target.value))}
            placeholder="20"
          />
        </Field>
        <Field label="Price (BDT)" htmlFor="new-pkg-price">
          <Input
            id="new-pkg-price"
            type="number"
            value={value.priceBdt}
            onChange={(e) => update('priceBdt', Number(e.target.value))}
            placeholder="599"
          />
        </Field>
        <Field label="Period" htmlFor="new-pkg-period">
          <Input
            id="new-pkg-period"
            value={value.period}
            onChange={(e) => update('period', e.target.value)}
            placeholder="/month"
          />
        </Field>
        <Field label="Sort order" htmlFor="new-pkg-sort">
          <Input
            id="new-pkg-sort"
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
            placeholder="0"
          />
        </Field>
        <Field
          label="Features (one per line)"
          htmlFor="new-pkg-features"
          className="sm:col-span-2"
        >
          <Textarea
            id="new-pkg-features"
            rows={4}
            value={value.features.join('\n')}
            onChange={(e) =>
              update(
                'features',
                e.target.value.split('\n').map((s) => s),
              )
            }
            placeholder={'Unlimited data\nFree router\n24/7 support'}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-1">
        <div className="flex items-center gap-2">
          <Switch
            id="new-pkg-popular"
            checked={value.isPopular}
            onCheckedChange={(v) => update('isPopular', v)}
          />
          <Label htmlFor="new-pkg-popular">Mark as popular</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="new-pkg-public"
            checked={value.isPublic}
            onCheckedChange={(v) => update('isPublic', v)}
          />
          <Label htmlFor="new-pkg-public">Visible publicly</Label>
        </div>
      </div>
    </ItemCard>
  )
}

/* ------------------------------------------------------------------ */
/*  PackagesEditor                                                    */
/* ------------------------------------------------------------------ */

export function PackagesEditor({
  packages,
  reload,
}: {
  packages: PackageData[]
  reload: () => void
}) {
  const [drafts, setDrafts] = React.useState<PackageData[]>([])

  const addDraft = () => {
    const nextSort =
      packages.length + drafts.length > 0
        ? Math.max(...packages.map((p) => p.sortOrder), ...drafts.map((d) => d.sortOrder), 0) + 1
        : 0
    setDrafts((d) => [...d, emptyPackage(nextSort)])
  }

  const removeDraft = (id: string) => {
    setDrafts((d) => d.filter((x) => x.id !== id))
  }

  const handleCreate = async (data: PackageData) => {
    const payload = { ...data }
    // strip the draft id; server will create a real one
    const { id: _id, ...rest } = payload
    const res = await apiFetch<{ package: PackageData }>('/api/cms/packages', {
      method: 'POST',
      body: JSON.stringify(rest),
    })
    if (res.ok) {
      toast.success(`Package "${data.name || 'Untitled'}" created`)
      removeDraft(data.id)
      reload()
    } else {
      toast.error(res.error || 'Failed to create package')
    }
  }

  return (
    <ListEditorShell
      title="Packages"
      count={packages.length + drafts.length}
      onAdd={addDraft}
      addLabel="Add new"
    >
      {packages.length === 0 && drafts.length === 0 ? (
        <EmptyState message='No packages yet. Click "Add new" to create one.' />
      ) : null}

      {drafts.map((d) => (
        <NewPackageDraft
          key={d.id}
          initial={d}
          onCreate={handleCreate}
          onCancel={() => removeDraft(d.id)}
        />
      ))}

      {packages.map((p) => (
        <PackageRow key={p.id} item={p} reload={reload} />
      ))}
    </ListEditorShell>
  )
}
