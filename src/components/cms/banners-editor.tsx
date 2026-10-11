'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { BannerData } from '@/lib/cms'
import {
  useFieldState,
  Field,
  ItemCard,
  ListEditorShell,
  EmptyState,
  apiFetch,
} from './_shared'

const MAX_BYTES = 5 * 1024 * 1024

/* ------------------------------------------------------------------ */
/*  Fields shared by existing + new banner cards                      */
/* ------------------------------------------------------------------ */

function BannerFields({
  idPrefix,
  value,
  update,
}: {
  idPrefix: string
  value: BannerData
  update: <K extends keyof BannerData>(k: K, v: BannerData[K]) => void
}) {
  const [uploading, setUploading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast.error('Image is too large (max 5 MB)')
      return
    }
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/cms/upload', { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        data?: { url: string }
        error?: string
      }
      if (json.ok && json.data?.url) {
        update('imageUrl', json.data.url)
        toast.success('Image uploaded — click Save to publish')
      } else {
        toast.error(json.error || 'Upload failed')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <Field
        label="Poster image"
        hint="Recommended 1200 × 900 px (4:3). PNG, JPG, WebP or GIF, up to 5 MB."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 sm:w-56">
            {value.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value.imageUrl}
                alt={value.title || 'Banner preview'}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus className="size-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              {value.imageUrl ? 'Replace image' : 'Upload image'}
            </Button>
            <Input
              aria-label="Image URL"
              value={value.imageUrl}
              onChange={(e) => update('imageUrl', e.target.value)}
              placeholder="…or paste an image URL (https://…)"
            />
          </div>
        </div>
      </Field>

      <Field
        label="Title (alt text)"
        htmlFor={`${idPrefix}-title`}
        hint="Describes the poster for screen readers and search engines."
      >
        <Input
          id={`${idPrefix}-title`}
          value={value.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Eid offer — 30 Mbps for BDT 700"
        />
      </Field>

      <Field
        label="Link (optional)"
        htmlFor={`${idPrefix}-link`}
        hint="Where the poster goes when clicked, e.g. #packages or https://…"
      >
        <Input
          id={`${idPrefix}-link`}
          value={value.linkUrl}
          onChange={(e) => update('linkUrl', e.target.value)}
          placeholder="#packages"
        />
      </Field>

      <div className="flex flex-wrap items-end gap-6">
        <Field label="Sort order" htmlFor={`${idPrefix}-sort`} className="max-w-[180px]">
          <Input
            id={`${idPrefix}-sort`}
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
        <div className="flex items-center gap-2 pb-2">
          <Switch
            id={`${idPrefix}-active`}
            checked={value.isActive}
            onCheckedChange={(v) => update('isActive', v)}
          />
          <Label htmlFor={`${idPrefix}-active`}>Show on site</Label>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Existing banner                                                   */
/* ------------------------------------------------------------------ */

function BannerRow({ item, reload }: { item: BannerData; reload: () => void }) {
  const [value, set, isDirty] = useFieldState<BannerData>(item)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof BannerData>(k: K, v: BannerData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await apiFetch(`/api/cms/banners?id=${encodeURIComponent(value.id)}`, {
      method: 'PUT',
      body: JSON.stringify(value),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Banner updated')
      reload()
    } else {
      toast.error(res.error || 'Failed to update banner')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this banner?')) return
    setSaving(true)
    const res = await apiFetch(`/api/cms/banners?id=${encodeURIComponent(value.id)}`, {
      method: 'DELETE',
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Banner deleted')
      reload()
    } else {
      toast.error(res.error || 'Failed to delete banner')
    }
  }

  return (
    <ItemCard dirty={isDirty} onSave={handleSave} onDelete={handleDelete} saving={saving}>
      <BannerFields idPrefix={`banner-${value.id}`} value={value} update={update} />
    </ItemCard>
  )
}

/* ------------------------------------------------------------------ */
/*  New (draft) banner                                                */
/* ------------------------------------------------------------------ */

function emptyBanner(sortOrder: number): BannerData {
  return {
    id: `draft-${Date.now()}`,
    title: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
    sortOrder,
  }
}

function NewBannerRow({
  initial,
  onCreate,
  onCancel,
}: {
  initial: BannerData
  onCreate: (data: BannerData) => Promise<void>
  onCancel: () => void
}) {
  const [value, set] = useFieldState<BannerData>(initial)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof BannerData>(k: K, v: BannerData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleCreate = async () => {
    if (!value.imageUrl.trim()) {
      toast.error('Upload an image first')
      return
    }
    setSaving(true)
    await onCreate(value)
    setSaving(false)
  }

  return (
    <ItemCard dirty isNew saving={saving} onSave={handleCreate} onCancel={onCancel}>
      <BannerFields idPrefix="new-banner" value={value} update={update} />
    </ItemCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Editor                                                            */
/* ------------------------------------------------------------------ */

export function BannersEditor({
  banners,
  reload,
}: {
  banners: BannerData[]
  reload: () => void
}) {
  const [drafts, setDrafts] = React.useState<BannerData[]>([])

  const addDraft = () => {
    const nextSort =
      banners.length + drafts.length > 0
        ? Math.max(...banners.map((b) => b.sortOrder), ...drafts.map((d) => d.sortOrder), 0) + 1
        : 0
    setDrafts((d) => [...d, emptyBanner(nextSort)])
  }

  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id))

  const handleCreate = async (data: BannerData) => {
    const { id: _id, ...rest } = data
    const res = await apiFetch('/api/cms/banners', {
      method: 'POST',
      body: JSON.stringify(rest),
    })
    if (res.ok) {
      toast.success('Banner created')
      removeDraft(data.id)
      reload()
    } else {
      toast.error(res.error || 'Failed to create banner')
    }
  }

  return (
    <ListEditorShell
      title="Banners & Offers"
      count={banners.length + drafts.length}
      onAdd={addDraft}
      addLabel="Add banner"
    >
      <p className="text-sm text-muted-foreground">
        Posters shown in the carousel at the top of the home page. One poster is
        shown as a single image; two or more become an auto-playing carousel.
      </p>

      {banners.length === 0 && drafts.length === 0 ? (
        <EmptyState message='No banners yet. Click "Add banner" to upload your first offer poster.' />
      ) : null}

      {drafts.map((d) => (
        <NewBannerRow
          key={d.id}
          initial={d}
          onCreate={handleCreate}
          onCancel={() => removeDraft(d.id)}
        />
      ))}

      {banners.map((b) => (
        <BannerRow key={b.id} item={b} reload={reload} />
      ))}
    </ListEditorShell>
  )
}
