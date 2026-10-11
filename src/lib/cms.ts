import { db } from '@/lib/db'

/* ------------------------------------------------------------------ */
/*  Shared content types                                              */
/* ------------------------------------------------------------------ */

export interface SiteSettingData {
  id: string
  brandName: string
  brandTagline: string
  heroEyebrow: string
  heroTitle: string
  heroAccent: string
  heroSubtitle: string
  primaryCta: string
  secondaryCta: string
  phone: string
  whatsapp: string
  email: string
  address: string
  portalUrl: string
  payUrl: string
  metaTitle: string
  metaDescription: string
  heroBadges: string[]
}

export interface PackageData {
  id: string
  name: string
  tag: string
  speedMbps: number
  priceBdt: number
  period: string
  isPopular: boolean
  isPublic: boolean
  features: string[]
  sortOrder: number
}

export interface TechItemData {
  id: string
  title: string
  description: string
  iconName: string
  sortOrder: number
}

export interface BenefitData {
  id: string
  title: string
  description: string
  iconName: string
  sortOrder: number
}

export interface SupportChannelData {
  id: string
  title: string
  value: string
  subtitle: string
  iconName: string
  sortOrder: number
}

export interface CoverageAreaData {
  id: string
  name: string
  slug: string
  description: string
  available: boolean
  latitude: number | null
  longitude: number | null
  radiusMeters: number
  sortOrder: number
}

export interface StatData {
  id: string
  label: string
  value: string
  iconName: string
  sortOrder: number
}

export interface FaqItemData {
  id: string
  question: string
  answer: string
  sortOrder: number
}

export interface BannerData {
  id: string
  title: string
  imageUrl: string
  linkUrl: string
  isActive: boolean
  sortOrder: number
}

export interface CmsContent {
  settings: SiteSettingData | null
  banners: BannerData[]
  packages: PackageData[]
  techItems: TechItemData[]
  benefits: BenefitData[]
  supportChannels: SupportChannelData[]
  coverageAreas: CoverageAreaData[]
  stats: StatData[]
  faqs: FaqItemData[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function parseFeatures(raw: string): string[] {
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.map(String) : []
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ */
/*  Data fetchers (server-side)                                       */
/* ------------------------------------------------------------------ */

export async function getSiteSettings(): Promise<SiteSettingData | null> {
  const s = await db.siteSetting.findUnique({ where: { id: 'default' } })
  if (!s) return null
  return { ...s, heroBadges: parseFeatures(s.heroBadges) }
}

export async function getPublicPackages(): Promise<PackageData[]> {
  const rows = await db.package.findMany({
    where: { isPublic: true },
    orderBy: { sortOrder: 'asc' },
  })
  return rows.map((r) => ({ ...r, features: parseFeatures(r.features) }))
}

export async function getAllPackages(): Promise<PackageData[]> {
  const rows = await db.package.findMany({ orderBy: { sortOrder: 'asc' } })
  return rows.map((r) => ({ ...r, features: parseFeatures(r.features) }))
}

export async function getTechItems(): Promise<TechItemData[]> {
  return db.techItem.findMany({ orderBy: { sortOrder: 'asc' } })
}

export async function getBenefits(): Promise<BenefitData[]> {
  return db.benefit.findMany({ orderBy: { sortOrder: 'asc' } })
}

export async function getSupportChannels(): Promise<SupportChannelData[]> {
  return db.supportChannel.findMany({ orderBy: { sortOrder: 'asc' } })
}

export async function getCoverageAreas(): Promise<CoverageAreaData[]> {
  return db.coverageArea.findMany({ orderBy: { sortOrder: 'asc' } })
}

export async function getStats(): Promise<StatData[]> {
  return db.stat.findMany({ orderBy: { sortOrder: 'asc' } })
}

export async function getFaqs(): Promise<FaqItemData[]> {
  return db.faqItem.findMany({ orderBy: { sortOrder: 'asc' } })
}

/** All banners (including inactive) — the public page filters on isActive. */
export async function getBanners(): Promise<BannerData[]> {
  return db.banner.findMany({ orderBy: { sortOrder: 'asc' } })
}

export async function getCmsContent(): Promise<CmsContent> {
  const [settings, banners, packages, techItems, benefits, supportChannels, coverageAreas, stats, faqs] =
    await Promise.all([
      getSiteSettings(),
      getBanners(),
      getPublicPackages(),
      getTechItems(),
      getBenefits(),
      getSupportChannels(),
      getCoverageAreas(),
      getStats(),
      getFaqs(),
    ])
  return { settings, banners, packages, techItems, benefits, supportChannels, coverageAreas, stats, faqs }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
