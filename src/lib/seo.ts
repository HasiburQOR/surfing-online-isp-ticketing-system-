import type { CmsContent } from '@/lib/cms'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://surfingonline.bd'

export function localBusinessSchema(content: CmsContent) {
  const s = content.settings
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#organization`,
    name: s?.brandName || 'Surfing Online',
    description: s?.metaDescription || 'Internet service provider in Bangladesh',
    url: SITE_URL,
    telephone: s?.phone,
    email: s?.email,
    address: { '@type': 'PostalAddress', addressLocality: s?.address || 'Dhaka', addressCountry: 'BD' },
    areaServed: content.coverageAreas.map((a) => a.name),
    openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], opens: '00:00', closes: '23:59' },
  }
}

export function packagesSchema(content: CmsContent) {
  return content.packages.map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.name} — ${p.speedMbps} Mbps`,
    description: p.features.join('. '),
    brand: { '@type': 'Brand', name: content.settings?.brandName || 'Surfing Online' },
    offers: { '@type': 'Offer', price: p.priceBdt, priceCurrency: 'BDT', availability: 'https://schema.org/InStock', url: `${SITE_URL}/#packages` },
  }))
}

export function faqSchema(content: CmsContent) {
  if (content.faqs.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

export function breadcrumbSchema() {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }] }
}
