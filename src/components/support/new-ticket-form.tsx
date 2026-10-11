'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { nativeSelectClass } from '@/components/ticketing/ticket-ui'

export function NewTicketForm({
  categories,
}: {
  categories: { id: string; nameEn: string; nameBn: string }[]
}) {
  const router = useRouter()
  const [categoryId, setCategoryId] = React.useState('')
  const [subject, setSubject] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, subject, description }),
      })
      if (res.status === 401) {
        router.replace('/support/login')
        return
      }
      const json = await res.json().catch(() => ({}))
      if (json.ok) {
        router.replace(`/support/tickets/${json.data.number}`)
        router.refresh()
      } else {
        setError(json.error || 'Could not create ticket')
        setBusy(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/support/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My tickets
      </Link>
      <Card className="gap-5 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Raise a new ticket</h1>
          <p className="text-sm text-muted-foreground">Tell us what&apos;s wrong and our team will get back to you.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category">What is it about?</Label>
            <select
              id="category"
              className={nativeSelectClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a category…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn}
                  {c.nameBn ? ` — ${c.nameBn}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Internet not working since morning"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              rows={6}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When did it start? Which lights are on your router? Anything else that helps."
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/support/tickets">Cancel</Link>
            </Button>
            <Button type="submit" disabled={busy || !categoryId || !subject.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit ticket
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
