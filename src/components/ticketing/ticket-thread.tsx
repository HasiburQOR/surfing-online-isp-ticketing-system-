import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/ticket-constants'
import { fmtDateTime } from './ticket-ui'

export interface ThreadComment {
  id: string
  authorType: string
  authorName: string
  body: string
  isInternal: boolean
  createdAt: string
}

export interface ThreadEvent {
  id: string
  eventType: string
  actorType: string
  actorName: string
  fromStatus: string | null
  toStatus: string | null
  note: string
  createdAt: string
}

type Item =
  | { kind: 'comment'; at: string; c: ThreadComment }
  | { kind: 'event'; at: string; e: ThreadEvent }

function eventText(e: ThreadEvent): string {
  const who = e.actorType === 'SYSTEM' ? 'System' : e.actorName || (e.actorType === 'ADMIN' ? 'Support team' : 'Customer')
  switch (e.eventType) {
    case 'CREATED':
      return `Ticket created by ${who}`
    case 'CLOSED':
      return `Closed by ${who}`
    case 'REOPENED':
      return `Reopened by ${who}`
    case 'STATUS_CHANGED':
      return `${who} changed status to ${STATUS_LABELS[e.toStatus ?? ''] ?? e.toStatus}`
    default:
      return `${who}: ${e.eventType.toLowerCase()}`
  }
}

/**
 * Conversation + status history in one chronological list.
 * `viewer` decides which side the bubbles sit on.
 */
export function TicketThread({
  comments,
  events,
  viewer,
}: {
  comments: ThreadComment[]
  events: ThreadEvent[]
  viewer: 'CUSTOMER' | 'ADMIN'
}) {
  const items: Item[] = [
    ...comments.map((c): Item => ({ kind: 'comment', at: c.createdAt, c })),
    ...events
      // "Ticket created" is already shown with the description above the thread.
      .filter((e) => e.eventType !== 'CREATED')
      .map((e): Item => ({ kind: 'event', at: e.createdAt, e })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No replies yet.</p>
  }

  return (
    <ol className="space-y-3">
      {items.map((item) =>
        item.kind === 'event' ? (
          <li key={`e-${item.e.id}`} className="text-center text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">
              {eventText(item.e)} · {fmtDateTime(item.at)}
            </span>
            {item.e.note && item.e.eventType !== 'CREATED' ? (
              <p className="mx-auto mt-1 max-w-md whitespace-pre-wrap italic">“{item.e.note}”</p>
            ) : null}
          </li>
        ) : (
          <li
            key={`c-${item.c.id}`}
            className={cn('flex', item.c.authorType === viewer ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl border px-4 py-2.5 text-sm shadow-sm sm:max-w-[75%]',
                item.c.isInternal
                  ? 'border-amber-300 bg-amber-50 text-amber-950'
                  : item.c.authorType === 'ADMIN'
                    ? 'border-primary/20 bg-primary/10 text-foreground'
                    : 'border-border bg-card text-foreground',
              )}
            >
              <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/80">
                  {item.c.authorName || (item.c.authorType === 'ADMIN' ? 'Support team' : 'Customer')}
                </span>
                {item.c.isInternal ? (
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 font-medium text-amber-900">Internal note</span>
                ) : null}
                <span>{fmtDateTime(item.at)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words">{item.c.body}</p>
            </div>
          </li>
        ),
      )}
    </ol>
  )
}
