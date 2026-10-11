import { Hono } from 'hono'
import type { Context, Next } from 'hono'
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
import { u, getSession, setSession, clearSession, verifyStaffLogin, type StaffSession } from '../auth'
import { db } from '../db'
import {
  createTicket,
  assignTicket,
  changeStatus,
  addComment,
  markResolved,
  confirmByPhoneManual,
  closeTicket,
  adminOverrideClose,
  reopenTicket,
  isValidTransition,
  type TicketStatus,
  type Priority,
  type Channel,
  type Actor,
} from '../services'

/* ------------------------------------------------------------------ */
/*  Router + middleware                                              */
/* ------------------------------------------------------------------ */

export const staffRoutes = new Hono<{ Variables: { session: StaffSession } }>()
staffRoutes.use('*', renderer)

async function requireStaff(c: Context, next: Next) {
  const session = await getSession(c)
  if (!session || session.type !== 'staff') {
    return c.redirect(u('/staff/login'))
  }
  c.set('session', session)
  await next()
}

async function requireAdmin(c: Context, next: Next) {
  const session = await getSession(c)
  if (!session || session.type !== 'staff' || session.role !== 'ADMIN') {
    return c.text('Forbidden: admin only', 403)
  }
  c.set('session', session)
  await next()
}

/* ------------------------------------------------------------------ */
/*  1. Login (GET)                                                   */
/* ------------------------------------------------------------------ */

staffRoutes.get('/login', async (c) => {
  const session = await getSession(c)
  if (session && session.type === 'staff') {
    return c.redirect(u('/staff'))
  }
  return c.render(
    <div class="max-w-md mx-auto">
      <Card>
        <h1 class="text-2xl font-bold text-primary mb-1">Staff Login</h1>
        <p class="text-sm text-gray-500 mb-4">Sign in to the support console.</p>
        <form method="post" action={u('/staff/login')} class="space-y-4">
          <Input label="Email" name="email" type="email" required placeholder="you@surfingonline.bd" />
          <Input label="Password" name="password" type="password" required placeholder="••••••••" />
          <Button type="submit" class="w-full">Sign in</Button>
        </form>
        <p class="text-xs text-gray-500 mt-4">
          Default logins: <code>admin@surfingonline.bd / admin123</code>,{' '}
          <code>agent@surfingonline.bd / agent123</code>
        </p>
      </Card>
    </div>,
    { title: 'Staff Login', staff: true }
  )
})

/* ------------------------------------------------------------------ */
/*  2. Login (POST)                                                  */
/* ------------------------------------------------------------------ */

staffRoutes.post('/login', async (c) => {
  const formData = await c.req.formData()
  const email = String(formData.get('email') || '').toLowerCase().trim()
  const password = String(formData.get('password') || '')
  const staff = await verifyStaffLogin(email, password)
  if (!staff) {
    return c.render(
      <div class="max-w-md mx-auto">
        <Card>
          <h1 class="text-2xl font-bold text-primary mb-1">Staff Login</h1>
          <div class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
            Invalid email or password.
          </div>
          <form method="post" action={u('/staff/login')} class="space-y-4">
            <Input label="Email" name="email" type="email" required value={email} placeholder="you@surfingonline.bd" />
            <Input label="Password" name="password" type="password" required placeholder="••••••••" />
            <Button type="submit" class="w-full">Sign in</Button>
          </form>
        </Card>
      </div>,
      { title: 'Staff Login', staff: true }
    )
  }
  await setSession(c, {
    type: 'staff',
    staffId: staff.id,
    email: staff.email,
    username: staff.username,
    role: staff.role,
    fullName: staff.fullName,
  })
  return c.redirect(u('/staff'))
})

/* ------------------------------------------------------------------ */
/*  3. Logout                                                        */
/* ------------------------------------------------------------------ */

staffRoutes.get('/logout', (c) => {
  clearSession(c)
  return c.redirect(u('/staff/login'))
})

/* ------------------------------------------------------------------ */
/*  4. Dashboard                                                     */
/* ------------------------------------------------------------------ */

staffRoutes.get('/', requireStaff, async (c) => {
  const session = c.get('session')
  const openStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'REOPENED']

  const [totalOpen, assignedToMe, unassigned, resolved, overdue, recentTickets] = await Promise.all([
    db.ticket.count({ where: { status: { in: openStatuses } } }),
    db.ticket.count({ where: { assignedToId: session.staffId, status: { in: openStatuses } } }),
    db.ticket.count({ where: { assignedToId: null, status: { in: openStatuses } } }),
    db.ticket.count({ where: { status: 'RESOLVED' } }),
    db.ticket.count({ where: { isOverdue: true, status: { in: openStatuses } } }),
    db.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { customer: true, assignedTo: true },
    }),
  ])

  const stats = [
    { label: 'Open tickets', value: totalOpen, color: 'text-blue-600' },
    { label: 'Assigned to me', value: assignedToMe, color: 'text-purple-600' },
    { label: 'Unassigned', value: unassigned, color: 'text-orange-600' },
    { label: 'Awaiting confirmation', value: resolved, color: 'text-green-600' },
    { label: 'Overdue', value: overdue, color: 'text-red-600' },
  ]

  return c.render(
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 class="text-2xl font-bold text-primary">Staff Dashboard</h1>
          <p class="text-sm text-gray-600">Welcome, {session.fullName} ({session.role})</p>
        </div>
        <a href={u('/staff/tickets/new')}>
          <Button variant="accent">+ New Ticket</Button>
        </a>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Card>
            <div class={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div class="text-xs text-gray-600 mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-gray-800">Recent tickets</h2>
          <a href={u('/staff/tickets')} class="text-sm text-primary hover:underline">View all →</a>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase text-gray-500 border-b border-purple-100">
                <th class="py-2 pr-3">Number</th>
                <th class="py-2 pr-3">Customer</th>
                <th class="py-2 pr-3">Subject</th>
                <th class="py-2 pr-3">Status</th>
                <th class="py-2 pr-3">Priority</th>
                <th class="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentTickets.length === 0 && (
                <tr><td colspan={6} class="py-6 text-center text-gray-400">No tickets yet</td></tr>
              )}
              {recentTickets.map((t) => (
                <tr class="border-b border-purple-50 hover:bg-purple-50/30">
                  <td class="py-2 pr-3">
                    <a href={u(`/staff/tickets/${t.number}`)} class="font-mono text-primary hover:underline">{t.number}</a>
                  </td>
                  <td class="py-2 pr-3">{t.customer.username}</td>
                  <td class="py-2 pr-3 max-w-xs truncate">{t.subject}</td>
                  <td class="py-2 pr-3"><StatusBadge status={t.status} /></td>
                  <td class="py-2 pr-3"><PriorityBadge priority={t.priority} /></td>
                  <td class="py-2 text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>,
    { title: 'Dashboard', staff: true }
  )
})

/* ------------------------------------------------------------------ */
/*  5. Tickets list with filters                                     */
/* ------------------------------------------------------------------ */

staffRoutes.get('/tickets', requireStaff, async (c) => {
  const session = c.get('session')
  const status = c.req.query('status')
  const priority = c.req.query('priority')
  const category = c.req.query('category')
  const assignee = c.req.query('assignee')
  const q = c.req.query('q')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (priority) where.priority = priority
  if (category) where.categoryId = category
  if (assignee === 'unassigned') where.assignedToId = null
  else if (assignee === 'me') where.assignedToId = session.staffId
  else if (assignee) where.assignedToId = assignee
  if (q && q.trim()) {
    where.OR = [
      { number: { contains: q } },
      { subject: { contains: q } },
      { customer: { username: { contains: q } } },
    ]
  }

  const [tickets, categories, staffList] = await Promise.all([
    db.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, assignedTo: true },
    }),
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    db.staffUser.findMany({ where: { isActive: true }, orderBy: { fullName: 'asc' } }),
  ])

  const statusOptions = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED']
  const priorityOptions = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

  return c.render(
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-primary">Tickets</h1>
        <a href={u('/staff/tickets/new')}><Button variant="accent">+ New Ticket</Button></a>
      </div>

      <Card>
        <form method="get" action={u('/staff/tickets')} class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
          <Input label="Search" name="q" value={q || ''} placeholder="Number / subject / username" />
          <Select label="Status" name="status">
            <option value="">Any</option>
            {statusOptions.map((s) => (
              <option value={s} selected={status === s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <Select label="Priority" name="priority">
            <option value="">Any</option>
            {priorityOptions.map((p) => (
              <option value={p} selected={priority === p}>{p}</option>
            ))}
          </Select>
          <Select label="Category" name="category">
            <option value="">Any</option>
            {categories.map((cat) => (
              <option value={cat.id} selected={category === cat.id}>{cat.nameEn}</option>
            ))}
          </Select>
          <Select label="Assignee" name="assignee">
            <option value="">Any</option>
            <option value="unassigned" selected={assignee === 'unassigned'}>Unassigned</option>
            <option value="me" selected={assignee === 'me'}>Me</option>
            {staffList.map((s) => (
              <option value={s.id} selected={assignee === s.id}>{s.fullName}</option>
            ))}
          </Select>
          <div class="md:col-span-5 flex justify-end">
            <Button type="submit">Apply filters</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase text-gray-500 border-b border-purple-100">
                <th class="py-2 pr-3">Number</th>
                <th class="py-2 pr-3">Customer</th>
                <th class="py-2 pr-3">Subject</th>
                <th class="py-2 pr-3">Status</th>
                <th class="py-2 pr-3">Priority</th>
                <th class="py-2 pr-3">Assigned</th>
                <th class="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 && (
                <tr><td colspan={7} class="py-6 text-center text-gray-400">No tickets match filters</td></tr>
              )}
              {tickets.map((t) => (
                <tr class="border-b border-purple-50 hover:bg-purple-50/30">
                  <td class="py-2 pr-3">
                    <a href={u(`/staff/tickets/${t.number}`)} class="font-mono text-primary hover:underline">{t.number}</a>
                  </td>
                  <td class="py-2 pr-3">{t.customer.username}</td>
                  <td class="py-2 pr-3 max-w-xs truncate">{t.subject}</td>
                  <td class="py-2 pr-3"><StatusBadge status={t.status} /></td>
                  <td class="py-2 pr-3"><PriorityBadge priority={t.priority} /></td>
                  <td class="py-2 pr-3">{t.assignedTo ? t.assignedTo.fullName : <span class="text-gray-400 italic">—</span>}</td>
                  <td class="py-2 text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>,
    { title: 'Tickets', staff: true }
  )
})

/* ------------------------------------------------------------------ */
/*  6. New ticket form                                               */
/* ------------------------------------------------------------------ */

staffRoutes.get('/tickets/new', requireStaff, async (c) => {
  const err = c.req.query('err')
  const [categories, staffList] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    db.staffUser.findMany({ where: { isActive: true }, orderBy: { fullName: 'asc' } }),
  ])

  return c.render(
    <div class="space-y-4 max-w-3xl">
      <h1 class="text-2xl font-bold text-primary">New Ticket</h1>

      {err && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{err}</div>
      )}

      <Card>
        <form method="post" action={u('/staff/tickets/new')} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Customer <span class="text-red-500">*</span>
            </label>
            <input type="hidden" name="customerId" id="customerId" required />
            <input
              type="text"
              name="q"
              placeholder="Type username, phone, or name to search…"
              class="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 mt-1"
              hx-get={u('/staff/customers/lookup')}
              hx-trigger="input changed delay:300ms"
              hx-target="#customerResults"
              autocomplete="off"
            />
            <div id="customerResults" class="border border-purple-100 rounded-lg mt-1 bg-white max-h-60 overflow-y-auto"></div>
            <div id="selectedCustomer"></div>
          </div>

          <Select label="Category" name="categoryId" required>
            {categories.map((cat) => <option value={cat.id}>{cat.nameEn}</option>)}
          </Select>

          <Input label="Subject" name="subject" required placeholder="Brief summary of the issue" />

          <Textarea label="Description" name="description" rows={5} placeholder="Detailed description from customer" />

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Priority" name="priority">
              <option value="LOW">Low</option>
              <option value="NORMAL" selected>Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
            <Select label="Channel" name="channel">
              <option value="PHONE">Phone</option>
              <option value="WALK_IN">Walk-in</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>

          <Select label="Assignee (optional)" name="assignedToId">
            <option value="">— Leave unassigned —</option>
            {staffList.map((s) => <option value={s.id}>{s.fullName} ({s.role})</option>)}
          </Select>

          <div class="flex gap-2 justify-end">
            <a href={u('/staff/tickets')}><Button type="button" variant="ghost">Cancel</Button></a>
            <Button type="submit">Create Ticket</Button>
          </div>
        </form>
      </Card>

      <script>{`
        function selectCustomerFromEl(el) {
          var id = el.getAttribute('data-id');
          var username = el.getAttribute('data-username');
          var name = el.getAttribute('data-name');
          var phone = el.getAttribute('data-phone');
          document.getElementById('customerId').value = id;
          document.getElementById('selectedCustomer').innerHTML =
            '<div class="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm"><strong>Selected:</strong> ' +
            name + ' (<code>' + username + '</code>) — ' + phone +
            ' <button type="button" onclick="clearCustomer()" class="ml-2 text-red-600 underline text-xs">change</button></div>';
          document.getElementById('customerResults').innerHTML = '';
        }
        function clearCustomer() {
          document.getElementById('customerId').value = '';
          document.getElementById('selectedCustomer').innerHTML = '';
        }
      `}</script>
    </div>,
    { title: 'New Ticket', staff: true }
  )
})

/* ------------------------------------------------------------------ */
/*  7. Customer lookup (HTMX fragment)                               */
/* ------------------------------------------------------------------ */

staffRoutes.get('/customers/lookup', requireStaff, async (c) => {
  const q = (c.req.query('q') || '').trim()
  if (!q) {
    return c.html(<div class="px-3 py-2 text-xs text-gray-400">Type to search customers…</div>)
  }

  const customers = await db.customer.findMany({
    where: {
      OR: [
        { username: { contains: q } },
        { phone: { contains: q } },
        { fullName: { contains: q } },
      ],
    },
    take: 10,
  })

  if (customers.length === 0) {
    return c.html(<div class="px-3 py-2 text-xs text-gray-500">No customers found.</div>)
  }

  return c.html(
    <>
      {customers.map((cust) => (
        <a
          href="#"
          data-id={cust.id}
          data-username={cust.username}
          data-name={cust.fullName}
          data-phone={cust.phone}
          onclick="selectCustomerFromEl(this); return false;"
          class="block px-3 py-2 hover:bg-purple-50 border-b border-purple-100 text-sm cursor-pointer"
        >
          <div class="font-semibold text-primary">{cust.username}</div>
          <div class="text-xs text-gray-600">{cust.fullName || '—'} · {cust.phone || '—'}</div>
        </a>
      ))}
    </>
  )
})

/* ------------------------------------------------------------------ */
/*  8. New ticket (POST)                                             */
/* ------------------------------------------------------------------ */

staffRoutes.post('/tickets/new', requireStaff, async (c) => {
  const session = c.get('session')
  const formData = await c.req.formData()
  const customerId = String(formData.get('customerId') || '').trim()
  const categoryId = String(formData.get('categoryId') || '').trim()
  const subject = String(formData.get('subject') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const priority = String(formData.get('priority') || 'NORMAL') as Priority
  const channel = String(formData.get('channel') || 'PHONE') as Channel
  const assignedToId = String(formData.get('assignedToId') || '').trim() || undefined

  if (!customerId) {
    return c.redirect(u('/staff/tickets/new?err=' + encodeURIComponent('Please select a customer.')))
  }

  const actor: Actor = { type: 'STAFF', staffId: session.staffId, name: session.fullName }
  const result = await createTicket({
    customerId,
    categoryId,
    subject,
    description,
    actor,
    channel,
    priority,
    assignedToId,
  })

  if (result.error || !result.ticket) {
    return c.redirect(u('/staff/tickets/new?err=' + encodeURIComponent(result.error || 'Failed to create ticket')))
  }

  return c.redirect(u(`/staff/tickets/${result.ticket.number}`))
})

/* ------------------------------------------------------------------ */
/*  9. Ticket detail                                                 */
/* ------------------------------------------------------------------ */

staffRoutes.get('/tickets/:number', requireStaff, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const errMsg = c.req.query('err')
  const successMsg = c.req.query('ok')

  const ticket = await db.ticket.findUnique({
    where: { number },
    include: {
      customer: true,
      category: true,
      assignedTo: true,
      createdBy: true,
      comments: { orderBy: { createdAt: 'asc' }, include: { authorStaff: true } },
      events: { orderBy: { createdAt: 'asc' }, include: { actorStaff: true } },
      confirmations: { orderBy: { createdAt: 'desc' }, include: { recordedByStaff: true } },
    },
  })
  if (!ticket) return c.text('Ticket not found', 404)

  const staffList = await db.staffUser.findMany({
    where: { isActive: true },
    orderBy: { fullName: 'asc' },
  })

  const validNext = (['ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED'] as TicketStatus[])
    .filter((s) => isValidTransition(ticket.status, s))

  return c.render(
    <div class="space-y-4">
      {/* Title row */}
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-bold text-primary font-mono">{ticket.number}</h1>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <div class="flex-1"></div>
        <a href={u('/staff/tickets')}><Button type="button" variant="ghost">← All tickets</Button></a>
      </div>

      {errMsg && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{errMsg}</div>
      )}
      {successMsg && (
        <div class="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">{successMsg}</div>
      )}

      <Stepper current={ticket.status} />

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ticket info */}
        <Card>
          <h2 class="font-semibold text-gray-800 mb-2">Ticket</h2>
          <dl class="text-sm space-y-1">
            <div><dt class="inline text-gray-500">Subject: </dt><dd class="inline font-medium">{ticket.subject}</dd></div>
            <div><dt class="inline text-gray-500">Category: </dt><dd class="inline">{ticket.category.nameEn}</dd></div>
            <div><dt class="inline text-gray-500">Channel: </dt><dd class="inline">{ticket.channel}</dd></div>
            <div>
              <dt class="inline text-gray-500">Created by: </dt>
              <dd class="inline">
                {ticket.createdByType === 'STAFF' ? (ticket.createdBy?.fullName || 'Staff') : 'Customer'}
              </dd>
            </div>
            <div><dt class="inline text-gray-500">Created: </dt><dd class="inline">{new Date(ticket.createdAt).toLocaleString()}</dd></div>
            <div><dt class="inline text-gray-500">Updated: </dt><dd class="inline">{new Date(ticket.updatedAt).toLocaleString()}</dd></div>
            {ticket.firstResponseAt && (
              <div><dt class="inline text-gray-500">First response: </dt><dd class="inline">{new Date(ticket.firstResponseAt).toLocaleString()}</dd></div>
            )}
            {ticket.resolvedAt && (
              <div><dt class="inline text-gray-500">Resolved: </dt><dd class="inline">{new Date(ticket.resolvedAt).toLocaleString()}</dd></div>
            )}
            {ticket.closedAt && (
              <div><dt class="inline text-gray-500">Closed: </dt><dd class="inline">{new Date(ticket.closedAt).toLocaleString()}</dd></div>
            )}
            <div><dt class="inline text-gray-500">Reopens: </dt><dd class="inline">{ticket.reopenCount}</dd></div>
            <div><dt class="inline text-gray-500">Resolution cycle: </dt><dd class="inline">{ticket.resolutionCycle}</dd></div>
          </dl>
          {ticket.description && (
            <div class="mt-3 pt-3 border-t border-purple-100">
              <div class="text-xs uppercase text-gray-500 mb-1">Description</div>
              <p class="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}
          {ticket.resolutionNote && (
            <div class="mt-3 pt-3 border-t border-purple-100">
              <div class="text-xs uppercase text-gray-500 mb-1">Resolution note</div>
              <p class="text-sm whitespace-pre-wrap">{ticket.resolutionNote}</p>
            </div>
          )}
        </Card>

        {/* Customer card */}
        <Card>
          <h2 class="font-semibold text-gray-800 mb-2">Customer</h2>
          <dl class="text-sm space-y-1">
            <div><dt class="inline text-gray-500">Username: </dt><dd class="inline font-medium">{ticket.customer.username}</dd></div>
            <div><dt class="inline text-gray-500">Name: </dt><dd class="inline">{ticket.customer.fullName || '—'}</dd></div>
            <div><dt class="inline text-gray-500">Phone: </dt><dd class="inline">{ticket.customer.phone || '—'}</dd></div>
            <div><dt class="inline text-gray-500">Area: </dt><dd class="inline">{ticket.customer.area || '—'}</dd></div>
            <div><dt class="inline text-gray-500">Package: </dt><dd class="inline">{ticket.customer.packageName || '—'}</dd></div>
            <div>
              <dt class="inline text-gray-500">Account status: </dt>
              <dd class="inline">
                <span class={`px-2 py-0.5 rounded text-xs font-semibold ${ticket.customer.accountStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {ticket.customer.accountStatus}
                </span>
              </dd>
            </div>
            {ticket.customer.address && (
              <div><dt class="inline text-gray-500">Address: </dt><dd class="inline">{ticket.customer.address}</dd></div>
            )}
          </dl>
        </Card>

        {/* Controls */}
        <Card>
          <h2 class="font-semibold text-gray-800 mb-3">Controls</h2>

          {/* Assignment */}
          <div class="mb-4">
            <div class="text-xs uppercase text-gray-500 mb-1">Current assignee</div>
            <div class="text-sm mb-2">
              {ticket.assignedTo
                ? `${ticket.assignedTo.fullName} (${ticket.assignedTo.role})`
                : <span class="italic text-gray-400">Unassigned</span>}
            </div>
            <form method="post" action={u(`/staff/tickets/${ticket.number}/assign`)} class="flex gap-2 items-end">
              <div class="flex-1">
                <Select label="Assign to" name="staffId">
                  <option value="">— Select —</option>
                  {staffList.map((s) => (
                    <option value={s.id} selected={ticket.assignedToId === s.id}>{s.fullName} ({s.role})</option>
                  ))}
                </Select>
              </div>
              <Button type="submit" variant="outline">Assign</Button>
            </form>
          </div>

          {/* Status change */}
          <div>
            <form method="post" action={u(`/staff/tickets/${ticket.number}/status`)} class="flex gap-2 items-end">
              <div class="flex-1">
                <Select label="Change status" name="toStatus">
                  {validNext.length === 0 && <option value="">No transitions available</option>}
                  {validNext.map((s) => <option value={s}>{s.replace(/_/g, ' ')}</option>)}
                </Select>
              </div>
              <Button type="submit" variant="outline">Apply</Button>
            </form>
            {validNext.includes('CLOSED') && (
              <p class="text-xs text-yellow-700 mt-1">Closing requires customer confirmation.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Resolve form */}
      {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
        <Card>
          <h2 class="font-semibold text-gray-800 mb-2">Resolve ticket</h2>
          <form method="post" action={u(`/staff/tickets/${ticket.number}/resolve`)} class="space-y-2">
            <Textarea label="Resolution note" name="resolutionNote" required placeholder="Describe what was done to fix the issue…" />
            <div class="flex justify-end"><Button type="submit" variant="accent">Mark as Resolved</Button></div>
          </form>
        </Card>
      )}

      {/* Confirmation panel (if RESOLVED) */}
      {ticket.status === 'RESOLVED' && (
        <Card>
          <h2 class="font-semibold text-gray-800 mb-2">Confirmation required to close</h2>
          <p class="text-sm text-gray-600 mb-3">
            This ticket is RESOLVED. To close it, customer confirmation is required.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form method="post" action={u(`/staff/tickets/${ticket.number}/confirm/phone-manual`)} class="space-y-2">
              <Textarea label="Confirm by phone (manual)" name="note" required placeholder="Record who you spoke with and what they confirmed…" rows={3} />
              <Button type="submit" variant="outline">Record phone confirmation</Button>
            </form>

            <form method="post" action={u(`/staff/tickets/${ticket.number}/close`)} class="space-y-2">
              <p class="text-sm text-gray-600">
                If a confirmation has been recorded above, attempt to close:
              </p>
              <Button type="submit" variant="accent">Close ticket</Button>
            </form>
          </div>

          {ticket.confirmations.length > 0 && (
            <div class="mt-3 pt-3 border-t border-purple-100">
              <div class="text-xs uppercase text-gray-500 mb-1">Confirmation history</div>
              <ul class="text-sm space-y-1">
                {ticket.confirmations.map((conf) => (
                  <li>
                    <span class={`px-2 py-0.5 rounded text-xs font-semibold ${conf.outcome === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {conf.outcome}
                    </span>
                    {' '}<span class="text-xs text-gray-600">{conf.method}</span>
                    {' '}<span class="text-xs text-gray-400">(cycle {conf.resolutionCycle})</span>
                    {conf.recordedByStaff && <span class="text-xs text-gray-500"> — by {conf.recordedByStaff.fullName}</span>}
                    {conf.note && <div class="text-xs text-gray-500 mt-0.5">{conf.note}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Admin override */}
      {session.role === 'ADMIN' && ticket.status !== 'CLOSED' && (
        <Card class="border-red-200">
          <h2 class="font-semibold text-red-700 mb-2">Admin override</h2>
          <p class="text-sm text-gray-600 mb-3">
            Force-close the ticket without customer confirmation. Use with caution.
          </p>
          <form method="post" action={u(`/staff/tickets/${ticket.number}/override-close`)} class="space-y-2">
            <Textarea label="Reason" name="reason" required placeholder="Explain why admin override is justified…" />
            <div class="flex justify-end"><Button type="submit" variant="danger">Force close (admin)</Button></div>
          </form>
        </Card>
      )}

      {/* Reopen (if CLOSED) */}
      {ticket.status === 'CLOSED' && (
        <Card>
          <h2 class="font-semibold text-gray-800 mb-2">Reopen ticket</h2>
          <form method="post" action={u(`/staff/tickets/${ticket.number}/reopen`)} class="space-y-2">
            <Textarea label="Reason for reopening" name="reason" required placeholder="Explain why this ticket is being reopened…" />
            <div class="flex justify-end"><Button type="submit" variant="outline">Reopen</Button></div>
          </form>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <h2 class="font-semibold text-gray-800 mb-3">Comments &amp; notes</h2>
        <div class="space-y-2 mb-4 max-h-96 overflow-y-auto">
          {ticket.comments.length === 0 && <p class="text-sm text-gray-400">No comments yet.</p>}
          {ticket.comments.map((cm) => (
            <div class={`p-3 rounded-lg text-sm ${cm.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-100'}`}>
              <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>
                  {cm.authorType === 'STAFF'
                    ? (cm.authorStaff?.fullName || 'Staff')
                    : cm.authorType === 'CUSTOMER' ? 'Customer' : 'System'}
                  {cm.isInternal && (
                    <span class="ml-2 px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-800 font-semibold">INTERNAL</span>
                  )}
                </span>
                <span>{new Date(cm.createdAt).toLocaleString()}</span>
              </div>
              <p class="whitespace-pre-wrap">{cm.body}</p>
            </div>
          ))}
        </div>

        {ticket.status !== 'CLOSED' && (
          <form method="post" action={u(`/staff/tickets/${ticket.number}/comment`)} class="space-y-2">
            <Textarea label="Add comment" name="body" required placeholder="Reply or add an internal note…" />
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="isInternal" value="true" class="rounded" />
                Internal note (only visible to staff)
              </label>
              <div class="flex-1"></div>
              <Button type="submit">Add comment</Button>
            </div>
          </form>
        )}
      </Card>

      {/* Timeline */}
      <Card>
        <h2 class="font-semibold text-gray-800 mb-3">Timeline (all events)</h2>
        <ol class="relative border-l border-purple-200 ml-2 space-y-3 max-h-96 overflow-y-auto">
          {ticket.events.map((ev) => (
            <li class="ml-4">
              <div class="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-primary"></div>
              <div class="text-xs text-gray-500">{new Date(ev.createdAt).toLocaleString()}</div>
              <div class="text-sm font-medium">
                {ev.eventType.replace(/_/g, ' ')}
                {ev.fromStatus && ev.toStatus && (
                  <span class="text-gray-500"> — {ev.fromStatus} → {ev.toStatus}</span>
                )}
              </div>
              <div class="text-xs text-gray-600">
                by {ev.actorType === 'STAFF' ? (ev.actorStaff?.fullName || 'Staff') : ev.actorType}
                {ev.note && <span> — {ev.note}</span>}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>,
    { title: `${ticket.number}`, staff: true }
  )
})

/* ------------------------------------------------------------------ */
/*  10. Assign                                                       */
/* ------------------------------------------------------------------ */

staffRoutes.post('/tickets/:number/assign', requireStaff, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await db.ticket.findUnique({ where: { number } })
  if (!ticket) return c.text('Ticket not found', 404)

  const formData = await c.req.formData()
  const staffId = String(formData.get('staffId') || '').trim()

  if (!staffId) {
    return c.redirect(u(`/staff/tickets/${number}?err=` + encodeURIComponent('Please select a staff member to assign.')))
  }

  const actor: Actor = { type: 'STAFF', staffId: session.staffId, name: session.fullName }
  const result = await assignTicket(ticket.id, staffId, actor)

  const qs = result.error ? '?err=' + encodeURIComponent(result.error) : ''
  return c.redirect(u(`/staff/tickets/${number}${qs}`))
})

/* ------------------------------------------------------------------ */
/*  11. Change status                                                */
/* ------------------------------------------------------------------ */

staffRoutes.post('/tickets/:number/status', requireStaff, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await db.ticket.findUnique({ where: { number } })
  if (!ticket) return c.text('Ticket not found', 404)

  const formData = await c.req.formData()
  const toStatus = String(formData.get('toStatus') || '') as TicketStatus

  const actor: Actor = { type: 'STAFF', staffId: session.staffId, name: session.fullName }
  const result = await changeStatus(ticket.id, toStatus, actor)

  const qs = result.error ? '?err=' + encodeURIComponent(result.error) : ''
  return c.redirect(u(`/staff/tickets/${number}${qs}`))
})

/* ------------------------------------------------------------------ */
/*  12. Add comment                                                  */
/* ------------------------------------------------------------------ */

staffRoutes.post('/tickets/:number/comment', requireStaff, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await db.ticket.findUnique({ where: { number } })
  if (!ticket) return c.text('Ticket not found', 404)

  const formData = await c.req.formData()
  const body = String(formData.get('body') || '')
  const isInternal = formData.get('isInternal') === 'true'

  const actor: Actor = { type: 'STAFF', staffId: session.staffId, name: session.fullName }
  const result = await addComment(ticket.id, actor, body, isInternal)

  const qs = result.error ? '?err=' + encodeURIComponent(result.error) : ''
  return c.redirect(u(`/staff/tickets/${number}${qs}`))
})

/* ------------------------------------------------------------------ */
/*  13. Resolve                                                      */
/* ------------------------------------------------------------------ */

staffRoutes.post('/tickets/:number/resolve', requireStaff, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await db.ticket.findUnique({ where: { number } })
  if (!ticket) return c.text('Ticket not found', 404)

  const formData = await c.req.formData()
  const note = String(formData.get('resolutionNote') || '')

  const actor: Actor = { type: 'STAFF', staffId: session.staffId, name: session.fullName }
  const result = await markResolved(ticket.id, actor, note)

  const qs = result.error
    ? '?err=' + encodeURIComponent(result.error)
    : '?ok=' + encodeURIComponent('Ticket marked as resolved.')
  return c.redirect(u(`/staff/tickets/${number}${qs}`))
})

/* ------------------------------------------------------------------ */
/*  14. Phone manual confirm                                         */
/* ------------------------------------------------------------------ */

staffRoutes.post('/tickets/:number/confirm/phone-manual', requireStaff, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await db.ticket.findUnique({ where: { number } })
  if (!ticket) return c.text('Ticket not found', 404)

  const formData = await c.req.formData()
  const note = String(formData.get('note') || '')

  const actor: Actor = { type: 'STAFF', staffId: session.staffId, name: session.fullName }
  const result = await confirmByPhoneManual(ticket.id, actor, note)

  const qs = result.error
    ? '?err=' + encodeURIComponent(result.error)
    : '?ok=' + encodeURIComponent('Phone confirmation recorded.')
  return c.redirect(u(`/staff/tickets/${number}${qs}`))
})

/* ------------------------------------------------------------------ */
/*  15. Close                                                        */
/* ------------------------------------------------------------------ */

staffRoutes.post('/tickets/:number/close', requireStaff, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await db.ticket.findUnique({ where: { number } })
  if (!ticket) return c.text('Ticket not found', 404)

  const actor: Actor = { type: 'STAFF', staffId: session.staffId, name: session.fullName }
  const result = await closeTicket(ticket.id, actor)

  const qs = result.error
    ? '?err=' + encodeURIComponent(result.error)
    : '?ok=' + encodeURIComponent('Ticket closed.')
  return c.redirect(u(`/staff/tickets/${number}${qs}`))
})

/* ------------------------------------------------------------------ */
/*  16. Override close (admin only)                                  */
/* ------------------------------------------------------------------ */

staffRoutes.post('/tickets/:number/override-close', requireAdmin, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await db.ticket.findUnique({ where: { number } })
  if (!ticket) return c.text('Ticket not found', 404)

  const formData = await c.req.formData()
  const reason = String(formData.get('reason') || '')

  const actor: Actor = { type: 'STAFF', staffId: session.staffId, name: session.fullName }
  const result = await adminOverrideClose(ticket.id, actor, reason)

  const qs = result.error
    ? '?err=' + encodeURIComponent(result.error)
    : '?ok=' + encodeURIComponent('Ticket force-closed by admin override.')
  return c.redirect(u(`/staff/tickets/${number}${qs}`))
})

/* ------------------------------------------------------------------ */
/*  17. Reopen                                                       */
/* ------------------------------------------------------------------ */

staffRoutes.post('/tickets/:number/reopen', requireStaff, async (c) => {
  const session = c.get('session')
  const number = c.req.param('number')
  const ticket = await db.ticket.findUnique({ where: { number } })
  if (!ticket) return c.text('Ticket not found', 404)

  const formData = await c.req.formData()
  const reason = String(formData.get('reason') || '')

  const actor: Actor = { type: 'STAFF', staffId: session.staffId, name: session.fullName }
  const result = await reopenTicket(ticket.id, actor, reason)

  const qs = result.error
    ? '?err=' + encodeURIComponent(result.error)
    : '?ok=' + encodeURIComponent('Ticket reopened.')
  return c.redirect(u(`/staff/tickets/${number}${qs}`))
})
