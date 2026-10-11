import { randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/**
 * First-run setup, safe to call repeatedly (runs once per server process):
 *  - creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if no admin exists
 *  - creates the default ticket categories if there are none
 *  - creates three demo customers if SEED_DEMO_DATA=true and there are no customers
 */

const DEFAULT_CATEGORIES = [
  { nameEn: 'No connection', nameBn: 'কোন সংযোগ নেই' },
  { nameEn: 'Slow speed', nameBn: 'ধীর গতি' },
  { nameEn: 'Intermittent connection', nameBn: 'ব্যাহত সংযোগ' },
  { nameEn: 'Billing/payment query', nameBn: 'বিল/পেমেন্ট সমস্যা' },
  { nameEn: 'Package change', nameBn: 'প্যাকেজ পরিবর্তন' },
  { nameEn: 'Router/equipment', nameBn: 'রাউটার/যন্ত্রপাতি' },
  { nameEn: 'New connection/relocation', nameBn: 'নতুন সংযোগ/স্থানান্তর' },
  { nameEn: 'Other', nameBn: 'অন্যান্য' },
]

const DEMO_CUSTOMERS = [
  { username: 'rahim123', fullName: 'Rahim Uddin', phone: '01712345678', address: 'House 12, Road 5, Dhanmondi', area: 'Dhaka', packageName: 'Standard 30Mbps' },
  { username: 'karim456', fullName: 'Karim Ahmed', phone: '01812345679', address: 'Flat 3B, Gulshan 2', area: 'Dhaka', packageName: 'Premium 60Mbps' },
  { username: 'fatima789', fullName: 'Fatima Begum', phone: '01912345680', address: 'House 45, Agrabad', area: 'Chattogram', packageName: 'Basic 10Mbps' },
]

async function run() {
  // 1. First admin
  if ((await db.adminUser.count()) === 0) {
    const email = (process.env.ADMIN_EMAIL || 'admin@surfingonline.bd').toLowerCase().trim()
    let password = process.env.ADMIN_PASSWORD
    // The demo password is only acceptable for a local test site. On any real
    // domain, refuse it and generate a random one instead.
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost')
    if (!password || password.length < 8 || (password === 'admin123' && !isLocal)) {
      password = randomBytes(9).toString('base64url')
      console.warn('==============================================================')
      console.warn(`[bootstrap] ADMIN_PASSWORD was not set (or was too weak for a live site).`)
      console.warn(`[bootstrap] Created admin ${email} with generated password:  ${password}`)
      console.warn('[bootstrap] Log in at /admin and change it with the Password button.')
      console.warn('==============================================================')
    } else if (password === 'admin123') {
      console.warn('[bootstrap] Local test mode: admin uses the demo password "admin123".')
    }
    await db.adminUser.create({
      data: { email, passwordHash: await hashPassword(password), fullName: 'Administrator' },
    })
    console.log(`[bootstrap] Created admin account ${email}`)
  }

  // 2. Ticket categories
  if ((await db.ticketCategory.count()) === 0) {
    await db.ticketCategory.createMany({
      data: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })),
    })
  }

  // 3. Demo customers (local testing only)
  if (process.env.SEED_DEMO_DATA === 'true' && (await db.customer.count()) === 0) {
    const demoPassword = process.env.DEMO_CUSTOMER_PASSWORD || 'customer123'
    const passwordHash = await hashPassword(demoPassword)
    for (const c of DEMO_CUSTOMERS) await db.customer.create({ data: { ...c, passwordHash } })
    console.log('[bootstrap] Created demo customers (SEED_DEMO_DATA=true)')
  }
}

let started: Promise<void> | null = null
export function ensureBootstrap(): Promise<void> {
  started ??= run().catch((err) => {
    started = null // retry next time
    console.error('[bootstrap] failed', err)
  })
  return started
}
