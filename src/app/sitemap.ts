import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://surfingonline.bd'
  const now = new Date()

  const routes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/#packages`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/#coverage`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/#support`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/#faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]

  return routes
}
