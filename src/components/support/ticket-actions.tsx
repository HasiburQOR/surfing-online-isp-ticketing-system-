'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, RotateCcw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Toaster } from '@/components/ui/sonner'
import { CUSTOMER_REOPEN_WINDOW_DAYS } from '@/lib/ticket-constants'

type Mode = null | 'close' | 'reopen'

/** Reply / close / reopen controls on the customer's ticket page. */
export function CustomerTicketActions({
  number,
  status,
  closedAt,
}: {
  number: string
  status: string
  closedAt: string | null
}) {
  const router = useRouter()
  const [reply, setReply] = React.useState('')
  const [note, setNote] = React.useState('')
  const [mode, setMode] = React.useState<Mode>(null)
  const [busy, setBusy] = React.useState(false)

  const isClosed = status === 'CLOSED'
  const canReopen =
    status === 'RESOLVED' ||
    (isClosed && (!closedAt || Date.now() - new Date(closedAt).getTime() < CUSTOMER_REOPEN_WINDOW_DAYS * 86_400_000))

  async function send(payload: Record<string, string>, success: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/support/tickets/${encodeURIComponent(number)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.status === 401) {
        router.replace('/support/login')
        return
      }
      const json = await res.json().catch(() => ({}))
      if (json.ok) {
        toast.success(success)
        setReply('')
        setNote('')
        setMode(null)
        router.refresh()
      } else {
        toast.error(json.error || 'Something went wrong')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="gap-4 p-5 sm:p-6">
      <Toaster richColors position="top-center" />

      {!isClosed ? (
        <div className="space-y-2">
          <label htmlFor="reply" className="text-sm font-medium text-foreground">
            Add a message
          </label>
          <Textarea
            id="reply"
            rows={4}
            maxLength={5000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write your reply…"
          />
          <div className="flex justify-end">
            <Button disabled={busy || !reply.trim()} onClick={() => send({ action: 'comment', body: reply }, 'Message sent')}>
              {busy && mode === null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This ticket is closed.{' '}
          {canReopen
            ? 'If the problem came back you can reopen it.'
            : `It can no longer be reopened (${CUSTOMER_REOPEN_WINDOW_DAYS}-day limit) - please raise a new ticket.`}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {!isClosed ? (
          <Button variant="outline" disabled={busy} onClick={() => setMode(mode === 'close' ? null : 'close')}>
            <CheckCircle2 className="h-4 w-4" /> Close this ticket
          </Button>
        ) : null}
        {canReopen ? (
          <Button variant="outline" disabled={busy} onClick={() => setMode(mode === 'reopen' ? null : 'reopen')}>
            <RotateCcw className="h-4 w-4" /> {isClosed ? 'Reopen ticket' : 'Not fixed — reopen'}
          </Button>
        ) : null}
      </div>

      {mode === 'close' ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm text-foreground">
            Close this ticket if your problem is solved or you no longer need help. You can still reopen it within{' '}
            {CUSTOMER_REOPEN_WINDOW_DAYS} days.
          </p>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a closing note (optional)" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy} onClick={() => send({ action: 'close', note }, 'Ticket closed')}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Yes, close ticket
            </Button>
          </div>
        </div>
      ) : null}

      {mode === 'reopen' ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm text-foreground">Tell us what is still wrong so we can look at it again.</p>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why are you reopening this ticket?" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy || !note.trim()} onClick={() => send({ action: 'reopen', reason: note }, 'Ticket reopened')}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Reopen ticket
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
