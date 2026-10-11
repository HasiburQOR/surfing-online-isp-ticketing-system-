import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/ticket-constants'

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-sky-100 text-sky-800 border-sky-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
  WAITING_CUSTOMER: 'bg-violet-100 text-violet-800 border-violet-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CLOSED: 'bg-slate-200 text-slate-700 border-slate-300',
  REOPENED: 'bg-rose-100 text-rose-800 border-rose-200',
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  NORMAL: 'bg-sky-50 text-sky-700 border-sky-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200',
}

const pill = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap'

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn(pill, STATUS_STYLES[status] ?? STATUS_STYLES.OPEN)}>{STATUS_LABELS[status] ?? status}</span>
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn(pill, PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.NORMAL)}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  )
}

/** Dates are rendered in Bangladesh time regardless of the server's timezone. */
export function fmtDateTime(d: string | Date): string {
  return new Date(d).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export const nativeSelectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'
