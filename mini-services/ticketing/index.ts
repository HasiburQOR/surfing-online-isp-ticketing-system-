import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { renderer } from './src/templates/layout'
import { customerRoutes } from './src/routes/customer'
import { staffRoutes } from './src/routes/staff'

const app = new Hono()
app.use('*', logger())
// Each route group applies its own `renderer` middleware (see
// templates/layout.tsx), which sets up c.render(...) AND adds the
// default <!DOCTYPE html> docType, so no app-level jsxRenderer is needed.

/* Mount routes */
app.route('/', customerRoutes)
app.route('/staff', staffRoutes)

/* Health check */
app.get('/health', (c) => c.json({ ok: true, service: 'ticketing' }))

const PORT = 3001
console.log(`🎫 Ticketing service running on http://localhost:${PORT}`)
export default { port: PORT, fetch: app.fetch }
