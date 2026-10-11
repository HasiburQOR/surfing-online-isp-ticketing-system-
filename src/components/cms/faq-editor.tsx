'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FaqItemData } from '@/lib/cms'
import {
  useFieldState,
  Field,
  ItemCard,
  ListEditorShell,
  EmptyState,
  apiFetch,
} from './_shared'

function FaqRow({ item, reload }: { item: FaqItemData; reload: () => void }) {
  const [value, set, isDirty] = useFieldState<FaqItemData>(item)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof FaqItemData>(k: K, v: FaqItemData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await apiFetch<{ faq: FaqItemData }>(
      `/api/cms/faqs?id=${encodeURIComponent(value.id)}`,
      { method: 'PUT', body: JSON.stringify(value) },
    )
    setSaving(false)
    if (res.ok) {
      toast.success('FAQ updated')
      reload()
    } else {
      toast.error(res.error || 'Failed to update FAQ')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this FAQ?')) return
    setSaving(true)
    const res = await apiFetch(`/api/cms/faqs?id=${encodeURIComponent(value.id)}`, {
      method: 'DELETE',
    })
    setSaving(false)
    if (res.ok) {
      toast.success('FAQ deleted')
      reload()
    } else {
      toast.error(res.error || 'Failed to delete FAQ')
    }
  }

  return (
    <ItemCard dirty={isDirty} onSave={handleSave} onDelete={handleDelete} saving={saving}>
      <div className="grid grid-cols-1 gap-4">
        <Field label="Question" htmlFor={`faq-q-${value.id}`}>
          <Input
            id={`faq-q-${value.id}`}
            value={value.question}
            onChange={(e) => update('question', e.target.value)}
            placeholder="What areas do you cover?"
          />
        </Field>
        <Field label="Answer" htmlFor={`faq-a-${value.id}`}>
          <Textarea
            id={`faq-a-${value.id}`}
            rows={3}
            value={value.answer}
            onChange={(e) => update('answer', e.target.value)}
            placeholder="We currently serve Dhaka, Chittagong…"
          />
        </Field>
        <Field label="Sort order" htmlFor={`faq-sort-${value.id}`} className="max-w-[180px]">
          <Input
            id={`faq-sort-${value.id}`}
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
      </div>
    </ItemCard>
  )
}

function emptyFaq(sortOrder: number): FaqItemData {
  return {
    id: `draft-${Date.now()}`,
    question: '',
    answer: '',
    sortOrder,
  }
}

function NewFaqRow({
  initial,
  onCreate,
  onCancel,
}: {
  initial: FaqItemData
  onCreate: (data: FaqItemData) => Promise<void>
  onCancel: () => void
}) {
  const [value, set, isDirty] = useFieldState<FaqItemData>(initial)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof FaqItemData>(k: K, v: FaqItemData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleCreate = async () => {
    setSaving(true)
    await onCreate(value)
    setSaving(false)
  }

  return (
    <ItemCard dirty={isDirty || true} isNew saving={saving} onSave={handleCreate} onCancel={onCancel}>
      <div className="grid grid-cols-1 gap-4">
        <Field label="Question" htmlFor="new-faq-q">
          <Input
            id="new-faq-q"
            value={value.question}
            onChange={(e) => update('question', e.target.value)}
            placeholder="What areas do you cover?"
          />
        </Field>
        <Field label="Answer" htmlFor="new-faq-a">
          <Textarea
            id="new-faq-a"
            rows={3}
            value={value.answer}
            onChange={(e) => update('answer', e.target.value)}
            placeholder="We currently serve Dhaka, Chittagong…"
          />
        </Field>
        <Field label="Sort order" htmlFor="new-faq-sort" className="max-w-[180px]">
          <Input
            id="new-faq-sort"
            type="number"
            value={value.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
      </div>
    </ItemCard>
  )
}

export function FaqEditor({
  faqs,
  reload,
}: {
  faqs: FaqItemData[]
  reload: () => void
}) {
  const [drafts, setDrafts] = React.useState<FaqItemData[]>([])

  const addDraft = () => {
    const nextSort =
      faqs.length + drafts.length > 0
        ? Math.max(...faqs.map((p) => p.sortOrder), ...drafts.map((d) => d.sortOrder), 0) + 1
        : 0
    setDrafts((d) => [...d, emptyFaq(nextSort)])
  }

  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id))

  const handleCreate = async (data: FaqItemData) => {
    const { id: _id, ...rest } = data
    const res = await apiFetch<{ faq: FaqItemData }>('/api/cms/faqs', {
      method: 'POST',
      body: JSON.stringify(rest),
    })
    if (res.ok) {
      toast.success('FAQ created')
      removeDraft(data.id)
      reload()
    } else {
      toast.error(res.error || 'Failed to create FAQ')
    }
  }

  return (
    <ListEditorShell
      title="FAQs"
      count={faqs.length + drafts.length}
      onAdd={addDraft}
      addLabel="Add new"
    >
      {faqs.length === 0 && drafts.length === 0 ? (
        <EmptyState message='No FAQs yet. Click "Add new" to create one.' />
      ) : null}

      {drafts.map((d) => (
        <NewFaqRow
          key={d.id}
          initial={d}
          onCreate={handleCreate}
          onCancel={() => removeDraft(d.id)}
        />
      ))}

      {faqs.map((p) => (
        <FaqRow key={p.id} item={p} reload={reload} />
      ))}
    </ListEditorShell>
  )
}
