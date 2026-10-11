'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFieldState, Field, ItemCard, ListEditorShell, EmptyState, apiFetch } from './_shared'

interface Category {
  id: string
  nameEn: string
  nameBn: string
  isActive: boolean
  sortOrder: number
  _count?: { tickets: number }
}

function CategoryFields({
  idPrefix,
  value,
  update,
}: {
  idPrefix: string
  value: Category
  update: <K extends keyof Category>(k: K, v: Category[K]) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Name (English)" htmlFor={`${idPrefix}-en`}>
        <Input id={`${idPrefix}-en`} value={value.nameEn} onChange={(e) => update('nameEn', e.target.value)} placeholder="Slow speed" />
      </Field>
      <Field label="Name (Bangla, optional)" htmlFor={`${idPrefix}-bn`}>
        <Input id={`${idPrefix}-bn`} value={value.nameBn} onChange={(e) => update('nameBn', e.target.value)} placeholder="ধীর গতি" />
      </Field>
      <Field label="Sort order" htmlFor={`${idPrefix}-sort`} className="max-w-[180px]">
        <Input id={`${idPrefix}-sort`} type="number" value={value.sortOrder} onChange={(e) => update('sortOrder', Number(e.target.value))} />
      </Field>
      <div className="flex items-center gap-2 sm:pt-6">
        <Switch id={`${idPrefix}-active`} checked={value.isActive} onCheckedChange={(v) => update('isActive', v)} />
        <Label htmlFor={`${idPrefix}-active`}>Available to customers</Label>
      </div>
    </div>
  )
}

function CategoryRow({ item, reload }: { item: Category; reload: () => void }) {
  const [value, set, dirty] = useFieldState<Category>(item)
  const [saving, setSaving] = React.useState(false)
  const update = <K extends keyof Category>(k: K, v: Category[K]) => set({ ...value, [k]: v })

  const save = async () => {
    setSaving(true)
    const res = await apiFetch(`/api/admin/categories?id=${encodeURIComponent(value.id)}`, { method: 'PUT', body: JSON.stringify(value) })
    setSaving(false)
    if (res.ok) {
      toast.success('Category updated')
      reload()
    } else toast.error(res.error || 'Update failed')
  }
  const remove = async () => {
    if (!confirm('Delete this category?')) return
    setSaving(true)
    const res = await apiFetch(`/api/admin/categories?id=${encodeURIComponent(value.id)}`, { method: 'DELETE' })
    setSaving(false)
    if (res.ok) {
      toast.success('Category deleted')
      reload()
    } else toast.error(res.error || 'Delete failed')
  }

  return (
    <ItemCard dirty={dirty} onSave={save} onDelete={remove} saving={saving}>
      <CategoryFields idPrefix={`cat-${value.id}`} value={value} update={update} />
      {item._count ? <p className="text-xs text-muted-foreground">Used by {item._count.tickets} ticket(s)</p> : null}
    </ItemCard>
  )
}

function NewCategoryRow({ initial, onCreate, onCancel }: { initial: Category; onCreate: (c: Category) => Promise<void>; onCancel: () => void }) {
  const [value, set] = useFieldState<Category>(initial)
  const [saving, setSaving] = React.useState(false)
  const update = <K extends keyof Category>(k: K, v: Category[K]) => set({ ...value, [k]: v })
  return (
    <ItemCard
      dirty
      isNew
      saving={saving}
      onCancel={onCancel}
      onSave={async () => {
        setSaving(true)
        await onCreate(value)
        setSaving(false)
      }}
    >
      <CategoryFields idPrefix="new-cat" value={value} update={update} />
    </ItemCard>
  )
}

export function CategoriesEditor() {
  const [items, setItems] = React.useState<Category[] | null>(null)
  const [drafts, setDrafts] = React.useState<Category[]>([])

  const load = React.useCallback(async () => {
    const res = await apiFetch<Category[]>('/api/admin/categories')
    if (res.ok && res.data) setItems(res.data)
    else {
      toast.error(res.error || 'Failed to load categories')
      setItems([])
    }
  }, [])
  React.useEffect(() => {
    load()
  }, [load])

  const addDraft = () => {
    const next = Math.max(-1, ...(items ?? []).map((i) => i.sortOrder), ...drafts.map((d) => d.sortOrder)) + 1
    setDrafts((d) => [...d, { id: `draft-${Date.now()}`, nameEn: '', nameBn: '', isActive: true, sortOrder: next }])
  }

  const create = async (c: Category) => {
    const { id, _count, ...rest } = c
    const res = await apiFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(rest) })
    if (res.ok) {
      toast.success('Category created')
      setDrafts((d) => d.filter((x) => x.id !== id))
      load()
    } else toast.error(res.error || 'Create failed')
  }

  if (items === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ListEditorShell title="Ticket Categories" count={items.length + drafts.length} onAdd={addDraft} addLabel="Add category">
      <p className="text-sm text-muted-foreground">The &ldquo;What is it about?&rdquo; options customers pick when raising a ticket.</p>
      {items.length === 0 && drafts.length === 0 ? <EmptyState message='No categories yet. Click "Add category".' /> : null}
      {drafts.map((d) => (
        <NewCategoryRow key={d.id} initial={d} onCreate={create} onCancel={() => setDrafts((x) => x.filter((y) => y.id !== d.id))} />
      ))}
      {items.map((c) => (
        <CategoryRow key={c.id} item={c} reload={load} />
      ))}
    </ListEditorShell>
  )
}
