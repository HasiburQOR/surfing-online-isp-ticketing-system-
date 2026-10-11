import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://surfingonline.bd'
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/support'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
