import { db } from '@/lib/db'
import { slugify } from '@/lib/cms'

/* ------------------------------------------------------------------ */
/*  Seed initial CMS content so the site renders out of the box.     */
/* ------------------------------------------------------------------ */

export async function seedCmsContent() {
  const results: string[] = []

  // 1. Site settings
  await db.siteSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      brandName: 'Surfing Online',
      brandTagline: 'ISP Bangladesh',
      heroEyebrow: 'Fastest Fiber in Town',
      heroTitle: 'Blazing-fast fiber internet for every home & business in',
      heroAccent: 'Bangladesh.',
      heroSubtitle:
        'Truly unlimited fiber broadband with 99.9% uptime, free installation, and 24/7 local support in Bangla & English. Connect today and experience the internet the way it should be.',
      primaryCta: 'View Packages',
      secondaryCta: 'Check Coverage',
      phone: '16XXX',
      whatsapp: '+880 1XXX-XXXXXX',
      email: 'support@surfingonline.bd',
      address: 'Dhaka, Bangladesh',
      portalUrl: '#',
      payUrl: '#',
      metaTitle: 'Surfing Online - Fast Fiber Internet Across Bangladesh',
      metaDescription:
        'Surfing Online brings fast, reliable fiber internet across Bangladesh. Affordable home & business packages, 24/7 local support. Check coverage and request a connection today.',
    },
  })
  results.push('SiteSetting')

  // 2. Packages
  const packageSeed = [
    { name: 'Basic', tag: 'Home Starter', speedMbps: 10, priceBdt: 500, period: '/month', isPopular: false, isPublic: true, features: ['Unlimited data', 'Fiber-to-home', 'Free installation', '1 router support'], sortOrder: 0 },
    { name: 'Standard', tag: 'Most Popular', speedMbps: 30, priceBdt: 900, period: '/month', isPopular: true, isPublic: true, features: ['Unlimited data', 'Fiber-to-home', 'Free dual-band router', 'Up to 8 devices', 'Priority support'], sortOrder: 1 },
    { name: 'Premium', tag: 'Power Users', speedMbps: 60, priceBdt: 1500, period: '/month', isPopular: false, isPublic: true, features: ['Unlimited data', 'Fiber-to-home', 'Free WiFi 6 router', 'Up to 20 devices', 'Static IP option'], sortOrder: 2 },
    { name: 'Business', tag: 'Enterprise', speedMbps: 100, priceBdt: 3000, period: '/month', isPopular: false, isPublic: true, features: ['Dedicated bandwidth', 'Symmetric upload/download', 'Static IP included', 'SLA guarantee', '24/7 priority engineer'], sortOrder: 3 },
  ]
  for (const p of packageSeed) {
    const existing = await db.package.findFirst({ where: { name: p.name } })
    if (!existing) await db.package.create({ data: { ...p, features: JSON.stringify(p.features) } })
  }
  results.push(`Packages (${packageSeed.length})`)

  // 3. Tech items
  const techSeed = [
    { title: 'GPON Fiber', description: 'Gigabit Passive Optical Network backbone across the country.', iconName: 'Cable' },
    { title: 'WiFi 6 Ready', description: 'Next-gen wireless routers for faster in-home coverage.', iconName: 'Router' },
    { title: 'DDoS Shield', description: 'Real-time traffic scrubbing to keep your line safe.', iconName: 'ShieldCheck' },
    { title: 'IPv6 Enabled', description: 'Future-proof addressing for all modern devices.', iconName: 'Globe' },
    { title: 'Local Peering', description: 'Direct peering with BDIX for blazing local speeds.', iconName: 'Server' },
    { title: 'Redundant Uplinks', description: 'Multiple tier-1 uplinks for zero downtime.', iconName: 'Signal' },
  ]
  for (const [i, t] of techSeed.entries()) {
    const existing = await db.techItem.findFirst({ where: { title: t.title } })
    if (!existing) await db.techItem.create({ data: { ...t, sortOrder: i } })
  }
  results.push(`TechItems (${techSeed.length})`)

  // 4. Benefits
  const benefitSeed = [
    { title: 'Blazing Speed', description: 'Symmetric fibre that keeps video calls and streams buffer-free.', iconName: 'Zap' },
    { title: 'Reliable Network', description: '99.9% uptime backed by an SLA on business plans.', iconName: 'ShieldCheck' },
    { title: 'Local Support', description: 'Bangla & English speaking agents, available round the clock.', iconName: 'Headphones' },
    { title: 'Easy Payments', description: 'bKash, Nagad, Rocket and card payments in a few taps.', iconName: 'CreditCard' },
  ]
  for (const [i, b] of benefitSeed.entries()) {
    const existing = await db.benefit.findFirst({ where: { title: b.title } })
    if (!existing) await db.benefit.create({ data: { ...b, sortOrder: i } })
  }
  results.push(`Benefits (${benefitSeed.length})`)

  // 5. Support channels
  const supportSeed = [
    { title: 'Hotline', value: '16XXX', subtitle: 'Toll-free, 24/7', iconName: 'Phone' },
    { title: 'WhatsApp', value: '+880 1XXX-XXXXXX', subtitle: 'Chat with an agent', iconName: 'Smartphone' },
    { title: 'Email', value: 'support@surfingonline.bd', subtitle: 'Replies within 2 hours', iconName: 'Mail' },
    { title: 'Visit Office', value: 'Dhaka, Bangladesh', subtitle: 'Find a branch near you', iconName: 'MapPin' },
  ]
  for (const [i, s] of supportSeed.entries()) {
    const existing = await db.supportChannel.findFirst({ where: { title: s.title } })
    if (!existing) await db.supportChannel.create({ data: { ...s, sortOrder: i } })
  }
  results.push(`SupportChannels (${supportSeed.length})`)

  // 6. Coverage areas (edit, add or remove in Admin > Coverage Areas)
  // Positions come from OpenStreetMap; "Tejkuni Bazar" is approximate. Fine-tune in the admin panel.
  const areaSeed = [
    { name: 'Farmgate', latitude: 23.7576, longitude: 90.3895, radiusMeters: 500 },
    { name: 'Kawran Bazar', latitude: 23.7511, longitude: 90.3931, radiusMeters: 450 },
    { name: 'Tejkuni Para', latitude: 23.7618, longitude: 90.3924, radiusMeters: 350 },
    { name: 'Tejkuni Bazar', latitude: 23.763, longitude: 90.3905, radiusMeters: 250 },
    { name: 'Begunbari', latitude: 23.7604, longitude: 90.405, radiusMeters: 400 },
    { name: 'BG Press Quarter', latitude: 23.7603, longitude: 90.3991, radiusMeters: 300 },
  ]
  for (const [i, a] of areaSeed.entries()) {
    const slug = slugify(a.name)
    const existing = await db.coverageArea.findFirst({ where: { slug } })
    if (!existing) {
      await db.coverageArea.create({
        data: { ...a, slug, description: `Fiber broadband available in ${a.name}, Dhaka.`, available: true, sortOrder: i },
      })
    }
  }
  results.push(`CoverageAreas (${areaSeed.length})`)

  // 7. Stats
  const statSeed = [
    { label: 'Active Subscribers', value: '50,000+', iconName: 'Users' },
    { label: 'Districts Covered', value: '24', iconName: 'MapPin' },
    { label: 'Network Uptime', value: '99.9%', iconName: 'Activity' },
    { label: 'Customer Support', value: '24/7', iconName: 'Clock' },
  ]
  for (const [i, s] of statSeed.entries()) {
    const existing = await db.stat.findFirst({ where: { label: s.label } })
    if (!existing) await db.stat.create({ data: { ...s, sortOrder: i } })
  }
  results.push(`Stats (${statSeed.length})`)

  // 8. FAQs
  const faqSeed = [
    { question: 'How long does installation take?', answer: 'Typically 1-3 business days after your request is confirmed, depending on fiber availability at your address.' },
    { question: 'Do you provide a static IP address?', answer: 'Static IP is available on Premium and Business plans. Contact support to enable it on your connection.' },
    { question: 'What payment methods do you accept?', answer: 'We accept bKash, Nagad, Rocket, credit/debit cards and internet banking through our payment partner.' },
    { question: 'Can I upgrade or downgrade my package later?', answer: 'Yes. You can change your package anytime from the customer portal or by calling our hotline. Changes apply from the next billing cycle.' },
    { question: 'Is there a fair usage policy?', answer: 'All home packages are truly unlimited. Business plans follow the SLA documented in your service agreement.' },
    { question: 'What are your support hours?', answer: 'Our customer care team is available 24 hours a day, 7 days a week, including public holidays.' },
  ]
  for (const [i, f] of faqSeed.entries()) {
    const existing = await db.faqItem.findFirst({ where: { question: f.question } })
    if (!existing) await db.faqItem.create({ data: { ...f, sortOrder: i } })
  }
  results.push(`FAQs (${faqSeed.length})`)

  return results
}
