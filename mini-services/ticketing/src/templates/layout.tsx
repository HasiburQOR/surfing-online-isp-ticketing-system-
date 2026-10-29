import { jsxRenderer } from 'hono/jsx-renderer'
import { u } from '../auth'

/* ------------------------------------------------------------------ */
/*  Base HTML layout                                                  */
/* ------------------------------------------------------------------ */

export const renderer = jsxRenderer(({ children, title, staff = false }) => {
  const brand = 'Surfing Online'
  const subtitle = staff ? 'Staff Console' : 'Support'
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} — {brand} Support</title>
        <meta name="robots" content="noindex, nofollow" />
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <link rel="icon" href="/surfing-online-icon.png" />
        <style>{`
          :root {
            --primary: #845EC2;
            --accent: #00C9A7;
            --cream: #FEFEDF;
          }
          body { background-color: var(--cream); }
          .bg-primary { background-color: var(--primary); }
          .text-primary { color: var(--primary); }
          .border-primary { border-color: var(--primary); }
          .bg-accent { background-color: var(--accent); }
          .text-accent { color: var(--accent); }
          .border-accent { border-color: var(--accent); }
          .bg-cream { background-color: var(--cream); }
        `}</style>
      </head>
      <body class="min-h-screen flex flex-col bg-cream text-gray-900">
        <header class="sticky top-0 z-40 border-b border-purple-200 bg-white/80 backdrop-blur">
          <div class="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
            <a href={u(staff ? '/staff' : '/')} class="flex items-center gap-2">
              <img src="/surfing-online-logo.png" alt={brand} class="h-10 w-auto" />
              <span class="text-sm font-semibold text-gray-600 hidden sm:block">{subtitle}</span>
            </a>
            <nav class="flex items-center gap-2 text-sm">
              {staff ? (
                <>
                  <a href={u('/staff')} class="px-3 py-1.5 text-gray-600 hover:text-primary">Dashboard</a>
                  <a href={u('/staff/tickets')} class="px-3 py-1.5 text-gray-600 hover:text-primary">Tickets</a>
                  <a href={u('/staff/logout')} class="px-3 py-1.5 text-red-600 hover:underline">Logout</a>
                </>
              ) : (
                <>
                  <a href={u('/')} class="px-3 py-1.5 text-gray-600 hover:text-primary">Home</a>
                  <a href={u('/tickets')} class="px-3 py-1.5 text-gray-600 hover:text-primary">My Tickets</a>
                  <a href={u('/staff')} class="px-3 py-1.5 text-gray-600 hover:text-primary">Staff</a>
                </>
              )}
            </nav>
          </div>
        </header>
        <main class="flex-1 mx-auto max-w-6xl w-full px-4 py-6">
          {children}
        </main>
        <footer class="border-t border-purple-200 bg-white/50 mt-auto">
          <div class="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {brand} — Support Ticketing System
          </div>
        </footer>
      </body>
    </html>
  )
})

/* ------------------------------------------------------------------ */
/*  UI helpers                                                        */
/* ------------------------------------------------------------------ */

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-800',
    ASSIGNED: 'bg-indigo-100 text-indigo-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    WAITING_CUSTOMER: 'bg-yellow-100 text-yellow-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-200 text-gray-700',
    REOPENED: 'bg-red-100 text-red-800',
  }
  const cls = colors[status] || 'bg-gray-100 text-gray-700'
  const label = status.replace(/_/g, ' ')
  return <span class={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

export function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-600',
    NORMAL: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  }
  const cls = colors[priority] || colors.NORMAL
  return <span class={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{priority}</span>
}

export function Stepper({ current }: { current: string }) {
  const steps = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
  const labels = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed']
  const currentIdx = steps.indexOf(current === 'REOPENED' ? 'IN_PROGRESS' : current === 'WAITING_CUSTOMER' ? 'IN_PROGRESS' : current)

  return (
    <div class="flex items-center w-full mb-6 overflow-x-auto">
      {steps.map((step, i) => {
        const isDone = i < currentIdx
        const isCurrent = i === currentIdx
        const isPast = i <= currentIdx
        return (
          <>
            {i > 0 && <div class={`h-0.5 flex-1 min-w-4 ${isPast ? 'bg-accent' : 'bg-gray-300'}`} />}
            <div class="flex flex-col items-center shrink-0">
              <div class={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isCurrent ? 'bg-accent text-white ring-4 ring-accent/20' :
                isDone ? 'bg-accent text-white' :
                'bg-gray-300 text-gray-500'
              }`}>
                {isDone ? '✓' : i + 1}
              </div>
              <span class={`text-[10px] mt-1 whitespace-nowrap ${isPast ? 'text-accent font-semibold' : 'text-gray-400'}`}>
                {labels[i]}
              </span>
            </div>
          </>
        )
      })}
    </div>
  )
}

export function Card({ children, class: cls = '' }: { children: any; class?: string }) {
  return <div class={`bg-white rounded-xl border border-purple-200 p-4 shadow-sm ${cls}`}>{children}</div>
}

export function Button({ type = 'button', variant = 'primary', class: cls = '', children, ...rest }: any) {
  const variants: Record<string, string> = {
    primary: 'bg-primary text-white hover:opacity-90',
    accent: 'bg-accent text-white hover:opacity-90',
    outline: 'border border-primary text-primary hover:bg-primary hover:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100',
  }
  return (
    <button type={type} class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${variants[variant]} ${cls}`} {...rest}>
      {children}
    </button>
  )
}

export function Input({ label, name, type = 'text', value = '', required = false, placeholder = '' }: any) {
  return (
    <div class="space-y-1">
      {label && <label class="block text-sm font-medium text-gray-700">{label}{required && <span class="text-red-500"> *</span>}</label>}
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        class="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
      />
    </div>
  )
}

export function Textarea({ label, name, value = '', required = false, rows = 4, placeholder = '' }: any) {
  return (
    <div class="space-y-1">
      {label && <label class="block text-sm font-medium text-gray-700">{label}{required && <span class="text-red-500"> *</span>}</label>}
      <textarea
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        class="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
      >{value}</textarea>
    </div>
  )
}

export function Select({ label, name, children, required = false }: any) {
  return (
    <div class="space-y-1">
      {label && <label class="block text-sm font-medium text-gray-700">{label}{required && <span class="text-red-500"> *</span>}</label>}
      <select
        name={name}
        required={required}
        class="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
      >
        {children}
      </select>
    </div>
  )
}
