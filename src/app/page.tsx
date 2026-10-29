import { db } from '@/lib/db'
import { getCmsContent, type CmsContent } from '@/lib/cms'
import { seedCmsContent } from '@/lib/seed'
import { localBusinessSchema, packagesSchema, faqSchema, breadcrumbSchema } from '@/lib/seo'
import { resolveIcon } from '@/lib/icons'
import { InteractiveLayer, LeadForm } from '@/components/site/interactive-layer'
import { HeroCarousel } from '@/components/site/hero-carousel'
import { CoverageExplorer } from '@/components/site/coverage-explorer'
import Image from 'next/image'
import {
  Wifi,
  ArrowRight,
  CheckCircle2,
  Facebook,
  Youtube,
  Linkedin,
  Phone,
  Mail,
  MapPin,
  Headphones,
  HelpCircle,
  Ticket as TicketIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

export const revalidate = 300

async function ensureContent(): Promise<CmsContent> {
  let settings = await db.siteSetting.findUnique({ where: { id: 'default' } })
  if (!settings) {
    await seedCmsContent()
    settings = await db.siteSetting.findUnique({ where: { id: 'default' } })
  }
  return getCmsContent()
}

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Packages', href: '#packages' },
  { label: 'Technology', href: '#technology' },
  { label: 'Support', href: '#support' },
  { label: 'Coverage', href: '#coverage' },
  { label: 'FAQ', href: '#faq' },
]

export default async function Home() {
  const content = await ensureContent()
  const slides = content.banners
    .filter((b) => b.isActive && b.imageUrl)
    .map(({ id, title, imageUrl, linkUrl }) => ({ id, title, imageUrl, linkUrl }))
  const availableCount = content.coverageAreas.filter((a) => a.available).length
  const { settings: s, packages, techItems, benefits, supportChannels, coverageAreas, stats, faqs } = content

  const jsonLd = [
    localBusinessSchema(content),
    ...packagesSchema(content),
    breadcrumbSchema(),
    ...(faqSchema(content) ? [faqSchema(content)] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col wf-grid-bg">
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      {/* Announcement bar */}
      <div className="bg-primary text-primary-foreground text-xs sm:text-sm">
        <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-center gap-2 text-center">
          <Wifi className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {s?.brandName || 'Surfing Online'} — Fast fiber internet across Bangladesh. Call {s?.phone || '16XXX'} to connect today.
          </span>
        </div>
      </div>

      <InteractiveLayer settings={s} packages={packages} />

      <main className="flex-1">
        {/* HERO */}
        <section id="home" className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:py-24">
            <div className={`grid gap-10 lg:items-center ${slides.length > 0 ? 'lg:grid-cols-2' : ''}`}>
              <div className="space-y-6">
                <span className="inline-block rounded-full bg-secondary/30 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  {s?.heroEyebrow || 'Fastest Fiber in Town'}
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-foreground">
                  {s?.heroTitle || 'Blazing-fast fiber internet for every home & business in'}{' '}
                  <span className="text-accent">{s?.heroAccent || 'Bangladesh.'}</span>
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                  {s?.heroSubtitle || 'Truly unlimited fiber broadband with 99.9% uptime, free installation, and 24/7 local support.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                    <a href="#packages">{s?.primaryCta || 'View Packages'}<ArrowRight className="ml-2 h-4 w-4" /></a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#coverage">{s?.secondaryCta || 'Check Coverage'}</a>
                  </Button>
                </div>
                {(s?.heroBadges?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground">
                    {s!.heroBadges.map((badge, i) => (
                      <span key={i} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> {badge}</span>
                    ))}
                  </div>
                )}
              </div>
              {slides.length > 0 && <HeroCarousel slides={slides} />}
            </div>
          </div>
        </section>

        {/* STATS */}
        {stats.length > 0 && (
          <section className="border-y border-border bg-primary text-primary-foreground">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                  const Icon = resolveIcon(stat.iconName)
                  return (
                    <div key={stat.id} className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15"><Icon className="h-5 w-5" /></div>
                      <div>
                        <div className="text-xl sm:text-2xl font-bold leading-none">{stat.value}</div>
                        <div className="text-xs sm:text-sm text-primary-foreground/80 mt-1">{stat.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* PACKAGES */}
        <section id="packages" className="py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl mx-auto text-center space-y-3">
              <span className="inline-block rounded-full bg-secondary/30 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Internet Packages</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Choose Your Perfect Plan</h2>
              <p className="text-muted-foreground text-sm sm:text-base">Affordable home and business internet plans with truly unlimited data, available across Bangladesh.</p>
            </div>
            {packages.length === 0 ? (
              <p className="mt-10 text-center text-muted-foreground">No packages available yet. Use the CMS panel to add packages.</p>
            ) : (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {packages.map((pkg) => (
                  <Card key={pkg.id} className={`relative flex flex-col p-5 ${pkg.isPopular ? 'border-2 border-accent shadow-lg' : 'border border-border'}`}>
                    {pkg.isPopular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Most Popular</span>}
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{pkg.tag}</div>
                    <div className="mt-1 text-lg font-bold text-foreground">{pkg.name}</div>
                    <div className="mt-4 flex items-end gap-1"><span className="text-3xl font-bold text-primary">{pkg.speedMbps}</span><span className="text-sm text-muted-foreground mb-1">Mbps</span></div>
                    <div className="mt-2 flex items-baseline gap-1"><span className="text-xs text-muted-foreground">BDT</span><span className="text-2xl font-bold text-foreground">{pkg.priceBdt}</span><span className="text-sm text-muted-foreground">{pkg.period}</span></div>
                    <ul className="mt-5 space-y-2.5 flex-1">
                      {pkg.features.map((f, i) => (<li key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />{f}</li>))}
                    </ul>
                    <Button className={`mt-5 w-full ${pkg.isPopular ? 'bg-accent text-accent-foreground hover:bg-accent/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`} asChild>
                      <a href="#lead-form">Choose Plan</a>
                    </Button>
                  </Card>
                ))}
              </div>
            )}
            <p className="mt-6 text-center text-xs text-muted-foreground">* Prices in BDT. All packages include free installation and unlimited data.</p>
          </div>
        </section>

        {/* TECHNOLOGY */}
        {techItems.length > 0 && (
          <section id="technology" className="py-14 sm:py-20 bg-secondary/15 border-y border-border">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div className="space-y-5">
                  <span className="inline-block rounded-full bg-secondary/30 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Technology Overview</span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Built on a Modern Fiber Backbone</h2>
                  <p className="text-muted-foreground text-sm sm:text-base">Our network uses GPON fiber, local BDIX peering, and redundant uplinks to deliver fast, reliable internet across the country.</p>
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild><a href="#lead-form">Learn About Our Network</a></Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {techItems.map((t) => {
                    const Icon = resolveIcon(t.iconName)
                    return (
                      <Card key={t.id} className="p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                        <div className="mt-3 text-sm font-semibold text-foreground">{t.title}</div>
                        <p className="mt-2 text-xs text-muted-foreground">{t.description}</p>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* BENEFITS */}
        {benefits.length > 0 && (
          <section id="benefits" className="py-14 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="max-w-2xl mx-auto text-center space-y-3">
                <span className="inline-block rounded-full bg-secondary/30 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Why Choose Us</span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">The Internet Experience You Deserve</h2>
                <p className="text-muted-foreground text-sm sm:text-base">Fast, reliable, and backed by local support that speaks your language.</p>
              </div>
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {benefits.map((b) => {
                  const Icon = resolveIcon(b.iconName)
                  return (
                    <Card key={b.id} className="p-5 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent"><Icon className="h-6 w-6" /></div>
                      <div className="mt-4 text-base font-semibold text-foreground">{b.title}</div>
                      <p className="mt-2 text-xs text-muted-foreground">{b.description}</p>
                    </Card>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* SUPPORT */}
        {supportChannels.length > 0 && (
          <section id="support" className="py-14 sm:py-20 bg-primary text-primary-foreground">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div className="space-y-5">
                  <span className="inline-block rounded-full bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">24/7 Service</span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Support That Never Sleeps</h2>
                  <p className="text-primary-foreground/85 text-sm sm:text-base">Our customer care team is available round the clock, every day of the year. Reach us by phone, WhatsApp, email, or visit any of our offices.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild><a href="#lead-form"><Headphones className="mr-2 h-4 w-4" />Contact Support</a></Button>
                    <Button variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild><a href={`tel:${s?.phone || ''}`}>Call Now</a></Button>
                    <Button className="bg-primary-foreground text-primary border border-primary-foreground hover:bg-primary-foreground/90" asChild><a href="/support"><TicketIcon className="mr-2 h-4 w-4" />Raise a Ticket</a></Button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {supportChannels.map((c) => {
                    const Icon = resolveIcon(c.iconName)
                    return (
                      <div key={c.id} className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 backdrop-blur">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/15"><Icon className="h-5 w-5" /></div>
                        <div className="mt-3 text-xs uppercase tracking-wider text-primary-foreground/70">{c.title}</div>
                        <div className="mt-1 text-base font-semibold">{c.value}</div>
                        {c.subtitle && <div className="text-xs text-primary-foreground/70">{c.subtitle}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* COVERAGE */}
        {coverageAreas.length > 0 && (
          <section id="coverage" className="py-14 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="max-w-2xl mx-auto text-center space-y-3">
                <span className="inline-block rounded-full bg-secondary/30 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Coverage Area</span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{availableCount === 1 ? "We Cover 1 Area" : `We Cover ${availableCount} Areas`}</h2>
                <p className="text-muted-foreground text-sm sm:text-base">High-speed fiber broadband in the areas below. Tap an area to see it on the map, or check if yours is covered.</p>
              </div>
              <CoverageExplorer areas={coverageAreas} />
            </div>
          </section>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <section id="faq" className="py-14 sm:py-20 bg-secondary/15 border-y border-border">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <div className="text-center space-y-3 mb-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/30 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider"><HelpCircle className="h-3.5 w-3.5" />FAQ</span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Frequently Asked Questions</h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={faq.id} value={`item-${i}`}>
                    <AccordionTrigger className="text-left text-base font-medium text-foreground hover:no-underline">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}

        <LeadForm settings={s} packages={packages} />
      </main>

      {/* FOOTER */}
      <footer className="bg-foreground text-background mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center">
                <Image src="/surfing-online-logo-white.png" alt="Surfing Online" width={1774} height={688} className="h-14 w-auto object-contain sm:h-16" />
              </div>
              <p className="text-xs text-background/70 max-w-xs">Fast, reliable fiber internet across Bangladesh. Affordable home &amp; business packages with 24/7 local support.</p>
              <div className="flex gap-2">
                {[Facebook, Youtube, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="flex h-9 w-9 items-center justify-center rounded-md bg-background/10 hover:bg-accent hover:text-accent-foreground transition-colors" aria-label="Social link"><Icon className="h-4 w-4" /></a>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-3">Quick Links</div>
              <ul className="space-y-2">
                {navLinks.map((l) => (<li key={l.label}><a href={l.href} className="text-xs text-background/70 hover:text-accent transition-colors">{l.label}</a></li>))}
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold mb-3">Services</div>
              <ul className="space-y-2">
                {['Home Broadband', 'Business Internet', 'Corporate Leased Line', 'Static IP'].map((l) => (<li key={l}><a href="#packages" className="text-xs text-background/70 hover:text-accent transition-colors">{l}</a></li>))}
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold mb-3">Contact</div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-background/70"><Phone className="h-3.5 w-3.5 text-accent shrink-0" /><a href={`tel:${s?.phone || ''}`} className="hover:text-accent">{s?.phone || '16XXX'}</a></li>
                <li className="flex items-center gap-2 text-xs text-background/70"><Mail className="h-3.5 w-3.5 text-accent shrink-0" /><a href={`mailto:${s?.email || ''}`} className="hover:text-accent">{s?.email || 'support@surfingonline.bd'}</a></li>
                <li className="flex items-center gap-2 text-xs text-background/70"><MapPin className="h-3.5 w-3.5 text-accent shrink-0" />{s?.address || 'Dhaka, Bangladesh'}</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-background/10 pt-6">
            <p className="text-xs text-background/60">&copy; {new Date().getFullYear()} {s?.brandName || 'Surfing Online'}. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-background/60">Payments:</span>
              {['bKash', 'Nagad', 'Rocket', 'Card'].map((p) => (<span key={p} className="rounded bg-background/10 px-2 py-1 text-[10px] text-background/70">{p}</span>))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
