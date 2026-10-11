import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import {
  renderer,
  Card,
  Button,
  Input,
  Textarea,
  Select,
  StatusBadge,
  PriorityBadge,
  Stepper,
} from '../templates/layout'
import { u, getSession, setSession, clearSession, type CustomerSession } from '../auth'
import { db } from '../db'
import {
  createTicket,
  addComment,
  confirmByCustomer,
  rejectResolution,
  reopenTicket,
  createOtpChallenge,
  verifyOtp,
  type Actor,
} from '../services'

/* ------------------------------------------------------------------ */
/*  Type augmentation: teach Hono's c.render() about the (children,   */
/*  props) signature used by the jsxRenderer in templates/layout.tsx.  */
/* ------------------------------------------------------------------ */

declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props: { title: string; staff?: boolean },
    ): Response | Promise<Response>
  }
}

/* ------------------------------------------------------------------ */
/*  Router + typed variables                                          */
/* ------------------------------------------------------------------ */

type CustomerEnv = { Variables: { session: CustomerSession } }

export const customerRoutes = new Hono<CustomerEnv>()

customerRoutes.use('*', renderer)

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || '—'
  return phone.slice(0, 2) + 'XXXXX' + phone.slice(-4)
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const REOPEN_WINDOW_DAYS = 7

function canReopen(status: string, closedAt: Date | null): boolean {
  if (status !== 'CLOSED' || !closedAt) return false
  const daysSinceClosed =
    (Date.now() - new Date(closedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysSinceClosed <= REOPEN_WINDOW_DAYS
}

function clientIp(c: any): string {
  return (
    c.req.header('x-forwarded-for') ||
    c.req.header('x-real-ip') ||
    c.env?.remoteAddr ||
    ''
  )
}

function actorFromSession(session: CustomerSession): Actor {
  return {
    type: 'CUSTOMER',
    customerId: session.customerId,
    name: session.fullName,
  }
}

/* ------------------------------------------------------------------ */
/*  Auth middleware                                                   */
/* ------------------------------------------------------------------ */

const requireCustomer: MiddlewareHandler<CustomerEnv> = async (c, next) => {
  const session = await getSession(c)
  if (!session || session.type !== 'customer') {
    return c.redirect(u('/login'))
  }
  c.set('session', session)
  await next()
}

/* ------------------------------------------------------------------ */
/*  1. Landing page                                                   */
/* ------------------------------------------------------------------ */

customerRoutes.get('/', async (c) => {
  const session = await getSession(c)
  if (session && session.type === 'customer') {
    return c.redirect(u('/tickets'))
  }
  return c.render(
    <div class="max-w-3xl mx-auto text-center py-10">
      <img
        src="/surfing-online-logo.png"
        alt="Surfing Online"
        class="h-24 w-auto mx-auto mb-6"
      />
      <h1 class="text-4xl font-bold text-gray-900 mb-3">
        Surfing Online Support
      </h1>
      <p class="text-gray-600 mb-8 max-w-xl mx-auto">
        Need help with your internet connection, billing, or equipment? Our
        customer care team is here to help. Raise a ticket and track its
        progress in real time.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center mb-10">
        <a
          href={u('/login')}
          class="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition"
        >
          Raise a Ticket
        </a>
        <a
          href={u('/login')}
          class="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition"
        >
          Track My Tickets
        </a>
      </div>
      <Card class="text-left">
        <h2 class="font-semibold text-gray-800 mb-2">How it works</h2>
        <ol class="list-decimal list-inside text-sm text-gray-600 space-y-1">
          <li>
            Log in with your customer username (we'll send an OTP to your
            registered phone).
          </li>
          <li>Choose a category and describe your issue.</li>
          <li>Our team will respond and keep you updated.</li>
          <li>
            When your issue is resolved, confirm it or request a reopen.
          </li>
        </ol>
      </Card>
      <p class="mt-6 text-sm text-gray-500">
        Staff member?{' '}
        <a href={u('/staff')} class="text-primary underline">
          Log in to the staff console
        </a>
        .
      </p>
    </div>,
    { title: 'Home' },
  )
})

/* ------------------------------------------------------------------ */
/*  2. Login — username form (GET)                                    */
/* ------------------------------------------------------------------ */

customerRoutes.get('/login', async (c) => {
  const session = await getSession(c)
  if (session && session.type === 'customer') {
    return c.redirect(u('/tickets'))
  }
  const error = c.req.query('error')
  return c.render(
    <div class="max-w-md mx-auto py-10">
      <Card>
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Customer Login</h1>
        <p class="text-sm text-gray-600 mb-5">
          Enter your username. We'll send a one-time code to your registered
          phone.
        </p>
        {error && (
          <div class="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        <form action={u('/login')} method="post" class="space-y-4">
          <Input
            label="Username"
            name="username"
            required
            placeholder="e.g. rahim123"
          />
          <Button type="submit" class="w-full">
            Send OTP
          </Button>
        </form>
      </Card>
      <p class="mt-4 text-center text-sm text-gray-500">
        <a href={u('/')} class="text-primary underline">
          Back to home
        </a>
      </p>
    </div>,
    { title: 'Customer Login' },
  )
})

/* ------------------------------------------------------------------ */
/*  3. Login — POST username                                          */
/* ------------------------------------------------------------------ */

customerRoutes.post('/login', async (c) => {
  const body = await c.req.parseBody()
  const username = String(body.username || '').trim().toLowerCase()
  if (!username) {
    return c.redirect(
      u('/login?error=' + encodeURIComponent('Username is required.')),
    )
  }
  const customer = await db.customer.findUnique({ where: { username } })
  if (!customer) {
    return c.redirect(
      u(
        '/login?error=' +
          encodeURIComponent(
            'No customer found with that username. Please contact support.',
          ),
      ),
    )
  }
  if (customer.accountStatus !== 'ACTIVE') {
    return c.redirect(
      u(
        '/login?error=' +
          encodeURIComponent(
            'Your account is ' +
              customer.accountStatus +
              '. Please contact support.',
          ),
      ),
    )
  }

  const { code, error } = await createOtpChallenge(
    'CUSTOMER_LOGIN',
    customer.id,
    clientIp(c),
  )
  if (error || !code) {
    return c.redirect(
      u(
        '/login?error=' +
          encodeURIComponent(error || 'Failed to send OTP. Please try again.'),
      ),
    )
  }

  // DEV MODE: pass OTP code in the redirect URL so the verify page can show it
  const verifyUrl =
    '/login/verify?customer_id=' +
    customer.id +
    '&dev_otp=' +
    encodeURIComponent(code)
  return c.redirect(u(verifyUrl))
})

/* ------------------------------------------------------------------ */
/*  4. Login — verify GET                                             */
/* ------------------------------------------------------------------ */

customerRoutes.get('/login/verify', async (c) => {
  const customerId = c.req.query('customer_id')
  const devOtp = c.req.query('dev_otp') || ''
  const error = c.req.query('error')

  if (!customerId) {
    return c.redirect(u('/login'))
  }
  const customer = await db.customer.findUnique({ where: { id: customerId } })
  if (!customer) {
    return c.redirect(
      u('/login?error=' + encodeURIComponent('Customer not found.')),
    )
  }

  const failUrlBase =
    '/login/verify?customer_id=' +
    customerId +
    (devOtp ? '&dev_otp=' + encodeURIComponent(devOtp) : '')

  return c.render(
    <div class="max-w-md mx-auto py-10">
      <Card>
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Verify OTP</h1>
        <p class="text-sm text-gray-600 mb-5">
          We sent a 6-digit code to your registered phone number{' '}
          <span class="font-semibold">{maskPhone(customer.phone)}</span>.
        </p>
        {devOtp && (
          <div class="mb-4 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-300 text-sm text-yellow-800">
            <strong>DEV MODE:</strong> your OTP code is{' '}
            <span class="font-mono font-bold tracking-wider">{devOtp}</span>
          </div>
        )}
        {error && (
          <div class="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        <form action={u(failUrlBase)} method="post" class="space-y-4">
          <Input
            label="OTP Code"
            name="code"
            required
            placeholder="6-digit code"
          />
          <Button type="submit" class="w-full">
            Verify &amp; Login
          </Button>
        </form>
      </Card>
      <p class="mt-4 text-center text-sm text-gray-500">
        <a href={u('/login')} class="text-primary underline">
          Use a different username
        </a>
      </p>
    </div>,
    { title: 'Verify OTP' },
  )
})

/* ------------------------------------------------------------------ */
/*  5. Login — verify POST                                            */
/* ------------------------------------------------------------------ */

customerRoutes.post('/login/verify', async (c) => {
  const customerId = c.req.query('customer_id')
  const devOtp = c.req.query('dev_otp') || ''
  const body = await c.req.parseBody()
  const code = String(body.code || '').trim()

  if (!customerId) {
    return c.redirect(u('/login'))
  }
  const customer = await db.customer.findUnique({ where: { id: customerId } })
  if (!customer) {
    return c.redirect(
      u('/login?error=' + encodeURIComponent('Customer not found.')),
    )
  }

  const failUrlBase =
    '/login/verify?customer_id=' +
    customerId +
    (devOtp ? '&dev_otp=' + encodeURIComponent(devOtp) : '')

  if (!code) {
    return c.redirect(
      u(failUrlBase + '&error=' + encodeURIComponent('Please enter the OTP code.')),
    )
  }

  const { valid, error } = await verifyOtp('CUSTOMER_LOGIN', customerId, code)
  if (!valid) {
    return c.redirect(
      u(failUrlBase + '&error=' + encodeURIComponent(error || 'Invalid OTP.')),
    )
  }

  const session: CustomerSession = {
    type: 'customer',
    customerId: customer.id,
    username: customer.username,
    fullName: customer.fullName,
  }
  await setSession(c, session)
  return c.redirect(u('/tickets'))
})

/* ------------------------------------------------------------------ */
/*  6. Logout                                                         */
/* ------------------------------------------------------------------ */

customerRoutes.get('/logout', (c) => {
  clearSession(c)
  return c.redirect(u('/'))
})

/* ------------------------------------------------------------------ */
/*  7. Tickets list                                                   */
/* ------------------------------------------------------------------ */

customerRoutes.get('/tickets', requireCustomer, async (c) => {
  const session = c.get('session')
  const tickets = await db.ticket.findMany({
    where: { customerId: session.customerId },
    orderBy: { createdAt: 'desc' },
  })
  return c.render(
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">My Tickets</h1>
          <p class="text-sm text-gray-600">
            Welcome back, {session.fullName}.
          </p>
        </div>
        <a
          href={u('/tickets/new')}
          class="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
        >
          + New Ticket
        </a>
      </div>
      {tickets.length === 0 ? (
        <Card class="text-center py-12">
          <p class="text-gray-500 mb-4">
            You haven't raised any tickets yet.
          </p>
          <a
            href={u('/tickets/new')}
            class="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
          >
            Raise your first ticket
          </a>
        </Card>
      ) : (
        <div class="space-y-3">
          {tickets.map((t) => (
            <a href={u('/tickets/' + encodeURIComponent(t.number))}>
              <Card class="hover:border-primary transition cursor-pointer">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <span class="font-mono text-xs text-gray-500">
                        {t.number}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                    <h3 class="font-semibold text-gray-900 truncate">
                      {t.subject}
                    </h3>
                    <p class="text-xs text-gray-500 mt-1">
                      Created {formatDate(t.createdAt)}
                    </p>
                  </div>
                  <span class="text-gray-400 text-lg">›</span>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>,
    { title: 'My Tickets' },
  )
})

/* ------------------------------------------------------------------ */
/*  8. New ticket — GET                                               */
/* ------------------------------------------------------------------ */

customerRoutes.get('/tickets/new', requireCustomer, async (c) => {
  const session = c.get('session')
  const [customer, categories] = await Promise.all([
    db.customer.findUnique({ where: { id: session.customerId } }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])
  const error = c.req.query('error')
  return c.render(
    <div class="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Raise a New Ticket</h1>
        <p class="text-sm text-gray-600">
          Tell us what's wrong and we'll get right on it.
        </p>
      </div>
      {error && (
        <div class="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      <Card>
        <form action={u('/tickets/new')} method="post" class="space-y-4">
          <Select label="Category" name="categoryId" required>
            <option value="">— Select a category —</option>
            {categories.map((cat) => (
              <option value={cat.id}>
                {cat.nameEn}
                {cat.nameBn ? ' (' + cat.nameBn + ')' : ''}
              </option>
            ))}
          </Select>
          <Input
            label="Subject"
            name="subject"
            required
            placeholder="Short summary of the issue"
          />
          <Textarea
            label="Description"
            name="description"
            required
            rows={6}
            placeholder="Describe the issue in detail. Include any error messages, when it started, and what you've tried."
          />
          <Input
            label="Preferred contact phone"
            name="contactPhone"
            type="tel"
            value={customer?.phone || ''}
            placeholder="01XXXXXXXXX"
          />
          <div class="flex gap-2 pt-2">
            <Button type="submit">Submit Ticket</Button>
            <a
              href={u('/tickets')}
              class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </a>
          </div>
        </form>
      </Card>
    </div>,
    { title: 'New Ticket' },
  )
})

/* ------------------------------------------------------------------ */
/*  9. New ticket — POST                                              */
/* ------------------------------------------------------------------ */

customerRoutes.post('/tickets/new', requireCustomer, async (c) => {
  const session = c.get('session')
  const body = await c.req.parseBody()
  const categoryId = String(body.categoryId || '').trim()
  const subject = String(body.subject || '').trim()
  const description = String(body.description || '').trim()

  if (!categoryId || !subject || !description) {
    return c.redirect(
      u(
        '/tickets/new?error=' +
          encodeURIComponent('Please fill in all required fields.'),
      ),
    )
  }

  const { ticket, error } = await createTicket({
    customerId: session.customerId,
    categoryId,
    subject,
    description,
    actor: actorFromSession(session),
    channel: 'WEB',
  })

  if (error || !ticket) {
    return c.redirect(
      u(
        '/tickets/new?error=' +
          encodeURIComponent(error || 'Could not create ticket.'),
      ),
    )
  }

  return c.redirect(u('/tickets/' + encodeURIComponent(ticket.number)))
})

/* ------------------------------------------------------------------ */
/*  Helper: load a customer's OWN ticket by number                   */
/*  (enforces customer isolation at the DB query layer)              */
/* ------------------------------------------------------------------ */

async function getOwnTicket(number: string, customerId: string) {
  return db.ticket.findFirst({
    where: { number, customerId },
    include: { category: true, assignedTo: true },
  })
}

/* ------------------------------------------------------------------ */
/*  10. Ticket detail                                                 */
/* ------------------------------------------------------------------ */

customerRoutes.get('/tickets/:number', requireCustomer, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await getOwnTicket(number, session.customerId)
  if (!ticket) {
    return c.render(
      <div class="max-w-md mx-auto py-12 text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Ticket not found</h1>
        <p class="text-gray-600 mb-6">
          We couldn't find ticket{' '}
          <span class="font-mono">{number}</span> in your account.
        </p>
        <a
          href={u('/tickets')}
          class="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
        >
          Back to My Tickets
        </a>
      </div>,
      { title: 'Not Found' },
    )
  }

  // ONLY public events + ONLY public comments (no internal notes)
  const [events, comments] = await Promise.all([
    db.ticketEvent.findMany({
      where: { ticketId: ticket.id, isPublic: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.ticketComment.findMany({
      where: { ticketId: ticket.id, isInternal: false },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const isResolved = ticket.status === 'RESOLVED'
  const reopenable = canReopen(ticket.status, ticket.closedAt)
  const error = c.req.query('error')
  const ok = c.req.query('ok')

  return c.render(
    <div class="space-y-5">
      {/* Header */}
      <div>
        <a
          href={u('/tickets')}
          class="text-sm text-gray-500 hover:text-primary"
        >
          ‹ My Tickets
        </a>
        <div class="flex items-start justify-between gap-3 mt-1">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="font-mono text-xs text-gray-500">
                {ticket.number}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 class="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
          </div>
        </div>
      </div>

      {error && (
        <div class="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {ok && (
        <div class="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          {ok}
        </div>
      )}

      {/* Stepper + meta */}
      <Card>
        <Stepper current={ticket.status} />
        <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <dt class="text-xs text-gray-500">Category</dt>
            <dd class="font-medium text-gray-800">
              {ticket.category?.nameEn || '—'}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Created</dt>
            <dd class="font-medium text-gray-800">
              {formatDate(ticket.createdAt)}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Assigned to</dt>
            <dd class="font-medium text-gray-800">
              {ticket.assignedTo?.fullName || 'Unassigned'}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Channel</dt>
            <dd class="font-medium text-gray-800">{ticket.channel}</dd>
          </div>
        </dl>
      </Card>

      {/* Description */}
      <Card>
        <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Description
        </h2>
        <p class="text-sm text-gray-800 whitespace-pre-wrap">
          {ticket.description || '—'}
        </p>
      </Card>

      {/* Conversation */}
      <Card>
        <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Conversation
        </h2>
        {comments.length === 0 ? (
          <p class="text-sm text-gray-500">
            No messages yet. Use the form below to reply.
          </p>
        ) : (
          <ul class="space-y-3 max-h-96 overflow-y-auto pr-1">
            {comments.map((cm) => {
              const isMe = cm.authorType === 'CUSTOMER'
              return (
                <li class={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    class={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      isMe ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div
                      class={`text-[10px] mb-0.5 ${
                        isMe ? 'text-white/80' : 'text-gray-500'
                      }`}
                    >
                      {isMe
                        ? 'You'
                        : cm.authorType === 'STAFF'
                          ? 'Support'
                          : 'System'}{' '}
                      · {formatDate(cm.createdAt)}
                    </div>
                    <div class="whitespace-pre-wrap">{cm.body}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Reply form (hidden when closed) */}
      {ticket.status !== 'CLOSED' && (
        <Card>
          <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Reply
          </h2>
          <form
            action={u(
              '/tickets/' + encodeURIComponent(ticket.number) + '/comment',
            )}
            method="post"
            class="space-y-3"
          >
            <Textarea
              name="body"
              required
              rows={3}
              placeholder="Type your reply..."
            />
            <Button type="submit">Send Reply</Button>
          </form>
        </Card>
      )}

      {/* Resolution actions */}
      {isResolved && (
        <Card class="border-accent">
          <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Is your problem fixed?
          </h2>
          <p class="text-sm text-gray-600 mb-3">
            Our team has marked this ticket as resolved. Please confirm or let
            us know if it's still not working.
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <form
              action={u(
                '/tickets/' + encodeURIComponent(ticket.number) + '/confirm',
              )}
              method="post"
            >
              <Button type="submit" variant="accent" class="w-full">
                ✅ My problem is fixed
              </Button>
            </form>
            <form
              action={u(
                '/tickets/' + encodeURIComponent(ticket.number) + '/reject',
              )}
              method="post"
              class="flex-1 flex flex-col sm:flex-row gap-2"
            >
              <Input
                name="note"
                placeholder="What's still wrong?"
                required
              />
              <Button type="submit" variant="danger" class="whitespace-nowrap">
                ❌ Still not fixed
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Reopen window */}
      {reopenable && (
        <Card>
          <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Reopen this ticket
          </h2>
          <p class="text-sm text-gray-600 mb-3">
            This ticket was closed on {formatDate(ticket.closedAt)}. You can
            reopen it within {REOPEN_WINDOW_DAYS} days of closure.
          </p>
          <form
            action={u(
              '/tickets/' + encodeURIComponent(ticket.number) + '/reopen',
            )}
            method="post"
            class="flex flex-col sm:flex-row gap-2"
          >
            <Input
              name="reason"
              required
              placeholder="Why are you reopening this ticket?"
            />
            <Button type="submit" variant="outline" class="whitespace-nowrap">
              Reopen Ticket
            </Button>
          </form>
        </Card>
      )}

      {/* Timeline (public events only) */}
      <Card>
        <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Timeline
        </h2>
        <ol class="relative border-l border-purple-200 ml-2 space-y-4">
          {events.map((ev) => (
            <li class="ml-4">
              <div class="absolute -left-[7px] w-3 h-3 rounded-full bg-accent mt-1.5" />
              <p class="text-sm text-gray-800">{ev.note || ev.eventType}</p>
              <p class="text-[11px] text-gray-500">
                {formatDate(ev.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </div>,
    { title: ticket.subject },
  )
})

/* ------------------------------------------------------------------ */
/*  11. Comment POST                                                  */
/* ------------------------------------------------------------------ */

customerRoutes.post('/tickets/:number/comment', requireCustomer, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await getOwnTicket(number, session.customerId)
  if (!ticket) {
    return c.redirect(u('/tickets'))
  }
  const body = await c.req.parseBody()
  const text = String(body.body || '').trim()
  if (!text) {
    return c.redirect(
      u(
        '/tickets/' +
          encodeURIComponent(number) +
          '?error=' +
          encodeURIComponent('Reply cannot be empty.'),
      ),
    )
  }
  const { error } = await addComment(ticket.id, actorFromSession(session), text, false)
  if (error) {
    return c.redirect(
      u(
        '/tickets/' +
          encodeURIComponent(number) +
          '?error=' +
          encodeURIComponent(error),
      ),
    )
  }
  return c.redirect(u('/tickets/' + encodeURIComponent(number)))
})

/* ------------------------------------------------------------------ */
/*  12. Confirm resolution POST                                       */
/* ------------------------------------------------------------------ */

customerRoutes.post('/tickets/:number/confirm', requireCustomer, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await getOwnTicket(number, session.customerId)
  if (!ticket) {
    return c.redirect(u('/tickets'))
  }
  const { error } = await confirmByCustomer(ticket.id, actorFromSession(session))
  if (error) {
    return c.redirect(
      u(
        '/tickets/' +
          encodeURIComponent(number) +
          '?error=' +
          encodeURIComponent(error),
      ),
    )
  }
  return c.redirect(
    u(
      '/tickets/' +
        encodeURIComponent(number) +
        '?ok=' +
        encodeURIComponent(
          'Thanks for confirming! Your ticket will be closed shortly.',
        ),
    ),
  )
})

/* ------------------------------------------------------------------ */
/*  13. Reject resolution POST                                        */
/* ------------------------------------------------------------------ */

customerRoutes.post('/tickets/:number/reject', requireCustomer, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await getOwnTicket(number, session.customerId)
  if (!ticket) {
    return c.redirect(u('/tickets'))
  }
  const body = await c.req.parseBody()
  const note = String(body.note || '').trim()
  const { error } = await rejectResolution(
    ticket.id,
    actorFromSession(session),
    note || 'Customer says still not fixed',
  )
  if (error) {
    return c.redirect(
      u(
        '/tickets/' +
          encodeURIComponent(number) +
          '?error=' +
          encodeURIComponent(error),
      ),
    )
  }
  return c.redirect(
    u(
      '/tickets/' +
        encodeURIComponent(number) +
        '?ok=' +
        encodeURIComponent(
          'Ticket reopened. Our team will look into it again.',
        ),
    ),
  )
})

/* ------------------------------------------------------------------ */
/*  14. Reopen POST                                                   */
/* ------------------------------------------------------------------ */

customerRoutes.post('/tickets/:number/reopen', requireCustomer, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await getOwnTicket(number, session.customerId)
  if (!ticket) {
    return c.redirect(u('/tickets'))
  }
  const body = await c.req.parseBody()
  const reason = String(body.reason || '').trim()
  if (!reason) {
    return c.redirect(
      u(
        '/tickets/' +
          encodeURIComponent(number) +
          '?error=' +
          encodeURIComponent('Please provide a reason for reopening.'),
      ),
    )
  }
  const { error } = await reopenTicket(ticket.id, actorFromSession(session), reason)
  if (error) {
    return c.redirect(
      u(
        '/tickets/' +
          encodeURIComponent(number) +
          '?error=' +
          encodeURIComponent(error),
      ),
    )
  }
  return c.redirect(
    u(
      '/tickets/' +
        encodeURIComponent(number) +
        '?ok=' +
        encodeURIComponent('Ticket reopened. Our team will follow up shortly.'),
    ),
  )
})
