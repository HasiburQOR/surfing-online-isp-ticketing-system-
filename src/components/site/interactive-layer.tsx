'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  ArrowRight,
  CheckCircle2,
  Phone,
  MessageCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import { toast } from 'sonner'
import type { SiteSettingData, PackageData } from '@/lib/cms'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Packages', href: '#packages' },
  { label: 'Technology', href: '#technology' },
  { label: 'Why Us', href: '#benefits' },
  { label: 'Support', href: '#support' },
  { label: 'Coverage', href: '#coverage' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Help Desk', href: '/support' },
]

interface InteractiveLayerProps {
  settings: SiteSettingData | null
  packages: PackageData[]
}

export function InteractiveLayer({ settings, packages }: InteractiveLayerProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  // "Customer Login" opens the support portal unless a different portal URL is set in the CMS.
  const portalUrl = settings?.portalUrl && settings.portalUrl !== '#' ? settings.portalUrl : '/support/login'
  const payUrl = settings?.payUrl || '#'

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-20 items-center justify-between">
            <a href="#home" className="flex items-center" aria-label="Surfing Online — home">
              <Image
                src="/surfing-online-logo.png"
                alt="Surfing Online"
                width={1775}
                height={688}
                className="h-12 w-auto object-contain sm:h-14"
                priority
              />
            </a>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary rounded-md transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <a href={portalUrl}>Customer Login</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={payUrl}>Pay Bill</a>
              </Button>
              <Button size="sm" asChild>
                <a href="#lead-form">Get Connection</a>
              </Button>
            </div>

            <div className="flex lg:hidden items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                <a href={payUrl} aria-label="Pay bill">
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
              <button
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t border-border py-3 overflow-hidden"
              >
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary rounded-md"
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={portalUrl}>Login</a>
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <a href={payUrl}>Pay Bill</a>
                    </Button>
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="fixed bottom-5 right-5 z-30 flex flex-col gap-2">
        <a
          href={`https://wa.me/${(settings?.whatsapp || '').replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 transition-colors"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      </div>
    </>
  )
}

export function LeadForm({
  settings,
  packages,
}: {
  settings: SiteSettingData | null
  packages: PackageData[]
}) {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const payload = {
      name: String(data.get('name') || ''),
      phone: String(data.get('phone') || ''),
      address: String(data.get('address') || ''),
      area: String(data.get('area') || ''),
      packageInterest: String(data.get('packageInterest') || ''),
      message: String(data.get('message') || ''),
    }
    if (!payload.name || !payload.phone) {
      toast.error('Please enter your name and phone number.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Submission failed')
      toast.success('Thank you! Our team will contact you shortly.')
      setDone(true)
      form.reset()
    } catch {
      toast.error('Something went wrong. Please call us instead.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="lead-form" className="py-14 sm:py-20 bg-accent/15 border-y border-accent/30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center space-y-3 mb-8">
          <span className="inline-block rounded-full bg-secondary/30 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Get Started Today
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Request a New Connection
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Fill in your details and our team will call you back within 2 hours.
          </p>
        </div>

        {done ? (
          <div className="rounded-xl border border-accent/40 bg-card p-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-accent mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">Request received!</h3>
            <p className="text-sm text-muted-foreground">
              Thank you for choosing {settings?.brandName || 'Surfing Online'}. Our team will reach out
              to you shortly.
            </p>
            <Button variant="outline" onClick={() => setDone(false)}>
              Submit another request
            </Button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" name="name" placeholder="Your name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" name="phone" type="tel" placeholder="01XXXXXXXXX" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" placeholder="House, road, area" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area">District / Area</Label>
                <Input id="area" name="area" placeholder="e.g. Dhaka" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="packageInterest">Package Interest</Label>
              <select
                id="packageInterest"
                name="packageInterest"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                defaultValue=""
              >
                <option value="">Select a package (optional)</option>
                {packages.map((p) => (
                  <option key={p.id} value={`${p.name} (${p.speedMbps} Mbps)`}>
                    {p.name} — {p.speedMbps} Mbps (BDT {p.priceBdt})
                  </option>
                ))}
                <option value="Not sure">Not sure — help me choose</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea id="message" name="message" placeholder="Any specific requirements?" rows={3} />
            </div>
            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  Request Callback <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              By submitting, you agree to be contacted by {settings?.brandName || 'Surfing Online'}.
              We never share your data.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
