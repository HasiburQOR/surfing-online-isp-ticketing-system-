'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CoverageAreaData } from '@/lib/cms'
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
/*  Map position fields (shared by existing + new rows)               */
/* ------------------------------------------------------------------ */

const COMMA = String.fromCharCode(44)

function GeoFields({
  idPrefix,
  value,
  patch,
}: {
  idPrefix: string
  value: CoverageAreaData
  patch: (p: Partial<CoverageAreaData>) => void
}) {
  // Keep what the admin is typing as text, so "23." doesn't turn into "23" mid-keystroke.
  const [lat, setLat] = React.useState(value.latitude == null ? '' : String(value.latitude))
  const [lng, setLng] = React.useState(value.longitude == null ? '' : String(value.longitude))

  const toNum = (t: string) => (t.trim() === '' || Number.isNaN(Number(t)) ? null : Number(t))

  const onLat = (t: string) => {
    // Google Maps copies "23.7571, 90.3893" in one go - split it across both boxes.
    if (t.includes(COMMA)) {
      const [a, b] = t.split(COMMA).map((x) => x.trim())
      setLat(a)
      setLng(b ?? '')
      patch({ latitude: toNum(a), longitude: toNum(b ?? '') })
      return
    }
    setLat(t)
    patch({ latitude: toNum(t) })
  }
  const onLng = (t: string) => {
    setLng(t)
    patch({ longitude: toNum(t) })
  }

  const partial = (lat.trim() === '') !== (lng.trim() === '')

  return (
    <div className="sm:col-span-2 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div>
        <p className="text-sm font-medium">Position on the map</p>
        <p className="text-xs text-muted-foreground">
          In Google Maps, right-click the centre of the area and click the numbers at the top of the menu to copy them,
          then paste into <em>Latitude</em> — both boxes fill in automatically. Leave empty to list the area without a map pin.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Latitude" htmlFor={`${idPrefix}-lat`}>
          <Input id={`${idPrefix}-lat`} inputMode="decimal" value={lat} onChange={(e) => onLat(e.target.value)} placeholder="23.7571" />
        </Field>
        <Field label="Longitude" htmlFor={`${idPrefix}-lng`}>
          <Input id={`${idPrefix}-lng`} inputMode="decimal" value={lng} onChange={(e) => onLng(e.target.value)} placeholder="90.3893" />
        </Field>
        <Field label="Circle radius (metres)" htmlFor={`${idPrefix}-rad`} hint="How far the area reaches">
          <Input
            id={`${idPrefix}-rad`}
            type="number"
            min={50}
            max={20000}
            value={value.radiusMeters}
            onChange={(e) => patch({ radiusMeters: Number(e.target.value) })}
          />
        </Field>
      </div>
      {partial ? <p className="text-xs text-destructive">Enter both latitude and longitude, or leave both empty.</p> : null}
    </div>
  )
}

function CoverageRow({ item, reload }: { item: CoverageAreaData; reload: () => void }) {
  const [value, set, isDirty] = useFieldState<CoverageAreaData>(item)
  const [saving, setSaving] = React.useState(false)
  // Track whether the user has manually edited the slug for this row.
  const [slugFrozen, setSlugFrozen] = React.useState<boolean>(Boolean(item.slug))

  const update = <K extends keyof CoverageAreaData>(k: K, v: CoverageAreaData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleNameChange = (name: string) => {
    if (slugFrozen) {
      update('name', name)
    } else {
      set({ ...value, name, slug: slugify(name) })
    }
  }

  const handleSlugChange = (slug: string) => {
    setSlugFrozen(true)
    update('slug', slug)
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await apiFetch<{ coverageArea: CoverageAreaData }>(
      `/api/cms/coverage?id=${encodeURIComponent(value.id)}`,
      { method: 'PUT', body: JSON.stringify(value) },
    )
    setSaving(false)
    if (res.ok) {
      toast.success(`Area "${value.name}" updated`)
      reload()
    } else {
      toast.error(res.error || 'Failed to update coverage area')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${value.name}"?`)) return
    setSaving(true)
    const res = await apiFetch(`/api/cms/coverage?id=${encodeURIComponent(value.id)}`, {
      method: 'DELETE',
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Area "${value.name}" deleted`)
      reload()
    } else {
      toast.error(res.error || 'Failed to delete coverage area')
    }
  }

  return (
    <ItemCard dirty={isDirty} onSave={handleSave} onDelete={handleDelete} saving={saving}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`cov-name-${value.id}`}>
          <Input
            id={`cov-name-${value.id}`}
            value={value.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Dhaka"
          />
        </Field>
        <Field
          label="Slug"
          htmlFor={`cov-slug-${value.id}`}
          hint={slugFrozen ? 'Frozen — manually edited' : 'Auto-generated from name'}
        >
          <Input
            id={`cov-slug-${value.id}`}
            value={value.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="dhaka"
          />
        </Field>
        <Field label="Description" htmlFor={`cov-desc-${value.id}`} className="sm:col-span-2">
          <Textarea
            id={`cov-desc-${value.id}`}
            rows={2}
            value={value.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Short description of coverage in this area…"
          />
        </Field>
        <GeoFields idPrefix={`cov-${value.id}`} value={value} patch={(p) => set({ ...value, ...p })} />
        <Field label="Sort order" htmlFor={`cov-sort-${value.id}`}>
          <Input
            id={`cov-sort-${value.id}`}
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
        <div className="flex items-center gap-2 self-end pb-1.5">
          <Switch
            id={`cov-avail-${value.id}`}
            checked={value.available}
            onCheckedChange={(v) => update('available', v)}
          />
          <Label htmlFor={`cov-avail-${value.id}`}>Available</Label>
        </div>
      </div>
    </ItemCard>
  )
}

function emptyCoverage(sortOrder: number): CoverageAreaData {
  return {
    id: `draft-${Date.now()}`,
    name: '',
    slug: '',
    description: '',
    available: true,
    latitude: null,
    longitude: null,
    radiusMeters: 600,
    sortOrder,
  }
}

function NewCoverageRow({
  initial,
  onCreate,
  onCancel,
}: {
  initial: CoverageAreaData
  onCreate: (data: CoverageAreaData) => Promise<void>
  onCancel: () => void
}) {
  const [value, set, isDirty] = useFieldState<CoverageAreaData>(initial)
  const [saving, setSaving] = React.useState(false)
  const [slugFrozen, setSlugFrozen] = React.useState(false)

  const update = <K extends keyof CoverageAreaData>(k: K, v: CoverageAreaData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleNameChange = (name: string) => {
    if (slugFrozen) {
      update('name', name)
    } else {
      set({ ...value, name, slug: slugify(name) })
    }
  }

  const handleSlugChange = (slug: string) => {
    setSlugFrozen(true)
    update('slug', slug)
  }

  const handleCreate = async () => {
    setSaving(true)
    await onCreate({ ...value, slug: value.slug || slugify(value.name) })
    setSaving(false)
  }

  return (
    <ItemCard dirty={isDirty || true} isNew saving={saving} onSave={handleCreate} onCancel={onCancel}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="new-cov-name">
          <Input
            id="new-cov-name"
            value={value.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Dhaka"
          />
        </Field>
        <Field
          label="Slug"
          htmlFor="new-cov-slug"
          hint={slugFrozen ? 'Frozen — manually edited' : 'Auto-generated from name'}
        >
          <Input
            id="new-cov-slug"
            value={value.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="dhaka"
          />
        </Field>
        <Field label="Description" htmlFor="new-cov-desc" className="sm:col-span-2">
          <Textarea
            id="new-cov-desc"
            rows={2}
            value={value.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Short description of coverage in this area…"
          />
        </Field>
        <GeoFields idPrefix="new-cov" value={value} patch={(p) => set({ ...value, ...p })} />
        <Field label="Sort order" htmlFor="new-cov-sort">
          <Input
            id="new-cov-sort"
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
        <div className="flex items-center gap-2 self-end pb-1.5">
          <Switch
            id="new-cov-avail"
            checked={value.available}
            onCheckedChange={(v) => update('available', v)}
          />
          <Label htmlFor="new-cov-avail">Available</Label>
        </div>
      </div>
    </ItemCard>
  )
}

export function CoverageEditor({
  coverageAreas,
  reload,
}: {
  coverageAreas: CoverageAreaData[]
  reload: () => void
}) {
  const [drafts, setDrafts] = React.useState<CoverageAreaData[]>([])

  const addDraft = () => {
    const nextSort =
      coverageAreas.length + drafts.length > 0
        ? Math.max(...coverageAreas.map((p) => p.sortOrder), ...drafts.map((d) => d.sortOrder), 0) + 1
        : 0
    setDrafts((d) => [...d, emptyCoverage(nextSort)])
  }

  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id))

  const handleCreate = async (data: CoverageAreaData) => {
    const { id: _id, ...rest } = data
    const res = await apiFetch<{ coverageArea: CoverageAreaData }>('/api/cms/coverage', {
      method: 'POST',
      body: JSON.stringify(rest),
    })
    if (res.ok) {
      toast.success(`Area "${data.name || 'Untitled'}" created`)
      removeDraft(data.id)
      reload()
    } else {
      toast.error(res.error || 'Failed to create coverage area')
    }
  }

  return (
    <ListEditorShell
      title="Coverage Areas"
      count={coverageAreas.length + drafts.length}
      onAdd={addDraft}
      addLabel="Add new"
    >
      {coverageAreas.length === 0 && drafts.length === 0 ? (
        <EmptyState message='No coverage areas yet. Click "Add new" to create one.' />
      ) : null}

      {drafts.map((d) => (
        <NewCoverageRow
          key={d.id}
          initial={d}
          onCreate={handleCreate}
          onCancel={() => removeDraft(d.id)}
        />
      ))}

      {coverageAreas.map((p) => (
        <CoverageRow key={p.id} item={p} reload={reload} />
      ))}
    </ListEditorShell>
  )
}
