import { db } from './db'
import bcrypt from 'bcryptjs'

async function seed() {
  // 1. Categories
  const categories = [
    { nameEn: 'No connection', nameBn: 'কোন সংযোগ নেই', sortOrder: 0 },
    { nameEn: 'Slow speed', nameBn: 'ধীর গতি', sortOrder: 1 },
    { nameEn: 'Intermittent connection', nameBn: 'ব্যাহত সংযোগ', sortOrder: 2 },
    { nameEn: 'Billing/payment query', nameBn: 'বিল/পেমেন্ট সমস্যা', sortOrder: 3 },
    { nameEn: 'Package change', nameBn: 'প্যাকেজ পরিবর্তন', sortOrder: 4 },
    { nameEn: 'Router/equipment', nameBn: 'রাউটার/যন্ত্রপাতি', sortOrder: 5 },
    { nameEn: 'New connection/relocation', nameBn: 'নতুন সংযোগ/স্থানান্তর', sortOrder: 6 },
    { nameEn: 'Other', nameBn: 'অন্যান্য', sortOrder: 7 },
  ]
  for (const c of categories) {
    const existing = await db.category.findFirst({ where: { nameEn: c.nameEn } })
    if (!existing) await db.category.create({ data: c })
  }
  console.log(`Seeded ${categories.length} categories`)

  // 2. Admin staff user
  const adminEmail = 'admin@surfingonline.bd'
  const existingAdmin = await db.staffUser.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10)
    await db.staffUser.create({
      data: {
        email: adminEmail,
        username: 'admin',
        passwordHash,
        role: 'ADMIN',
        fullName: 'System Admin',
        phone: '01XXXXXXXXX',
        isActive: true,
      },
    })
    console.log('Created admin user: admin@surfingonline.bd / admin123')
  }

  // 3. Agent staff user
  const agentEmail = 'agent@surfingonline.bd'
  const existingAgent = await db.staffUser.findUnique({ where: { email: agentEmail } })
  if (!existingAgent) {
    const passwordHash = await bcrypt.hash('agent123', 10)
    await db.staffUser.create({
      data: {
        email: agentEmail,
        username: 'agent',
        passwordHash,
        role: 'AGENT',
        fullName: 'Support Agent',
        phone: '01YYYYYYYYY',
        isActive: true,
      },
    })
    console.log('Created agent user: agent@surfingonline.bd / agent123')
  }

  // 4. Sample customers
  const customers = [
    { username: 'rahim123', fullName: 'Rahim Uddin', phone: '01712345678', address: 'House 12, Road 5, Dhanmondi', area: 'Dhaka', packageName: 'Standard 30Mbps', accountStatus: 'ACTIVE' },
    { username: 'karim456', fullName: 'Karim Ahmed', phone: '01812345679', address: 'Flat 3B, Gulshan 2', area: 'Dhaka', packageName: 'Premium 60Mbps', accountStatus: 'ACTIVE' },
    { username: 'fatima789', fullName: 'Fatima Begum', phone: '01912345680', address: 'House 45, Agrabad', area: 'Chattogram', packageName: 'Basic 10Mbps', accountStatus: 'ACTIVE' },
  ]
  for (const c of customers) {
    const existing = await db.customer.findUnique({ where: { username: c.username } })
    if (!existing) await db.customer.create({ data: c })
  }
  console.log(`Seeded ${customers.length} customers`)

  console.log('\nSeed complete!')
  console.log('Staff login: admin@surfingonline.bd / admin123')
  console.log('Staff login: agent@surfingonline.bd / agent123')
  console.log('Customer usernames: rahim123, karim456, fatima789')
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect())
