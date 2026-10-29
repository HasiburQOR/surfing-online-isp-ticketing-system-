'use client'

import * as React from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  Settings as SettingsIcon,
  Package,
  Cpu,
  Sparkles,
  Headphones,
  MapPin,
  BarChart3,
  HelpCircle,
  Loader2,
  Database,
  Menu,
  GalleryHorizontal,
  Ticket,
  UserPlus,
  Users,
  Tags,
  LogOut,
  KeyRound,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { CmsContent } from '@/lib/cms'
import { SettingsEditor } from './settings-editor'
import { BannersEditor } from './banners-editor'
import { PackagesEditor } from './packages-editor'
import { TechEditor } from './tech-editor'
import { BenefitsEditor } from './benefits-editor'
import { SupportEditor } from './support-editor'
import { CoverageEditor } from './coverage-editor'
import { StatsEditor } from './stats-editor'
import { FaqEditor } from './faq-editor'
import { TicketsManager } from './tickets-manager'
import { LeadsManager } from './leads-manager'
import { CustomersManager } from './customers-manager'
import { CategoriesEditor } from './categories-editor'
import { apiFetch } from './_shared'

/* ------------------------------------------------------------------ */
/*  Sections                                                          */
/* ------------------------------------------------------------------ */

type SectionId =
  | 'tickets'
  | 'leads'
  | 'customers'
  | 'categories'
  | 'settings'
  | 'banners'
  | 'packages'
  | 'tech'
  | 'benefits'
  | 'support'
  | 'coverage'
  | 'stats'
  | 'faqs'

interface SectionMeta {
  id: SectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const GROUPS: { title: string; sections: SectionMeta[] }[] = [
  {
    title: 'Inbox',
    sections: [
      { id: 'tickets', label: 'Support Tickets', icon: Ticket },
      { id: 'leads', label: 'Connection Requests', icon: UserPlus },
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'categories', label: 'Ticket Categories', icon: Tags },
    ],
  },
  {
    title: 'Website',
    sections: [
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
      { id: 'banners', label: 'Banners & Offers', icon: GalleryHorizontal },
      { id: 'packages', label: 'Packages', icon: Package },
      { id: 'tech', label: 'Technology', icon: Cpu },
      { id: 'benefits', label: 'Benefits', icon: Sparkles },
      { id: 'support', label: 'Support Info', icon: Headphones },
      { id: 'coverage', label: 'Coverage Areas', icon: MapPin },
      { id: 'stats', label: 'Stats', icon: BarChart3 },
      { id: 'faqs', label: 'FAQs', icon: HelpCircle },
    ],
  },
]

const ALL_SECTIONS = GROUPS.flatMap((g) => g.sections)

/* ------------------------------------------------------------------ */
/*  AdminPanel                                                        */
/* ------------------------------------------------------------------ */

export function AdminPanel({ adminEmail }: { adminEmail: string }) {
  const [content, setContent] = React.useState<CmsContent | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [seeding, setSeeding] = React.useState(false)
  const [active, setActive] = React.useState<SectionId>('tickets')
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const [summary, setSummary] = React.useState<{ newLeads: number; activeTickets: number } | null>(null)
  const [pwOpen, setPwOpen] = React.useState(false)

  const reload = React.useCallback(async () => {
    try {
      const res = await fetch('/api/cms/content', { cache: 'no-store' })
      if (res.status === 401) {
        window.location.href = '/admin/login'
        return
      }
      setContent((await res.json()) as CmsContent)
    } catch (err) {
      console.error('[cms] reload failed', err)
      toast.error('Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshSummary = React.useCallback(async () => {
    const res = await apiFetch<{ newLeads: number; activeTickets: number }>('/api/admin/summary')
    if (res.ok && res.data) setSummary(res.data)
  }, [])

  React.useEffect(() => {
    reload()
    refreshSummary()
    // Keep the inbox badges fresh while the panel stays open.
    const t = setInterval(refreshSummary, 60_000)
    return () => clearInterval(t)
  }, [reload, refreshSummary])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/cms/seed', { method: 'POST' })
      const json = await res.json()
      if (json.ok) {
        toast.success('Initial content seeded')
        await reload()
      } else {
        toast.error(json.error || 'Seed failed')
      }
    } catch (err) {
      console.error('[cms] seed failed', err)
      toast.error('Seed failed')
    } finally {
      setSeeding(false)
    }
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  const badgeFor = (id: SectionId): number => {
    if (id === 'tickets') return summary?.activeTickets ?? 0
    if (id === 'leads') return summary?.newLeads ?? 0
    return content ? sectionCount(id, content) : 0
  }

  const renderActive = () => {
    switch (active) {
      case 'tickets':
        return <TicketsManager onChanged={refreshSummary} />
      case 'leads':
        return <LeadsManager onChanged={refreshSummary} />
      case 'customers':
        return <CustomersManager />
      case 'categories':
        return <CategoriesEditor />
    }
    // Everything below edits website content.
    if (loading) return <LoadingState />
    if (!content) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="text-sm text-muted-foreground">Failed to load content.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={reload}>
            Try again
          </Button>
        </div>
      )
    }
    if (!content.settings) return <SeedState onSeed={handleSeed} seeding={seeding} />
    switch (active) {
      case 'settings':
        return <SettingsEditor settings={content.settings} reload={reload} />
      case 'banners':
        return <BannersEditor banners={content.banners} reload={reload} />
      case 'packages':
        return <PackagesEditor packages={content.packages} reload={reload} />
      case 'tech':
        return <TechEditor techItems={content.techItems} reload={reload} />
      case 'benefits':
        return <BenefitsEditor benefits={content.benefits} reload={reload} />
      case 'support':
        return <SupportEditor supportChannels={content.supportChannels} reload={reload} />
      case 'coverage':
        return <CoverageEditor coverageAreas={content.coverageAreas} reload={reload} />
      case 'stats':
        return <StatsEditor stats={content.stats} reload={reload} />
      case 'faqs':
        return <FaqEditor faqs={content.faqs} reload={reload} />
    }
  }

  // Inbox badges are "needs attention" counts, so they stand out from plain item counts.
  const attention = (id: SectionId) => id === 'tickets' || id === 'leads'

  return (
    <div className="flex h-screen flex-col bg-background">
      <Toaster richColors position="top-right" />

      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen((v) => !v)} aria-label="Toggle sections">
            <Menu className="size-5" />
          </Button>
          <div className="flex h-9 items-center rounded-md bg-white px-2 shadow-sm ring-1 ring-border">
            <Image src="/surfing-online-logo.png" alt="Surfing Online logo" height={688} width={1775} className="h-7 w-auto object-contain" priority />
          </div>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-base font-bold tracking-tight text-foreground">Admin</span>
            <span className="text-[11px] text-muted-foreground">{adminEmail}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">View site</span>
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
            <KeyRound className="size-4" />
            <span className="hidden sm:inline">Password</span>
          </Button>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Sidebar - desktop */}
        <nav aria-label="Admin sections" className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-card/50 md:flex scroll-area-thin">
          {GROUPS.map((g) => (
            <div key={g.title} className="p-2">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
              <ul className="flex flex-col gap-0.5">
                {g.sections.map((s) => {
                  const Icon = s.icon
                  const count = badgeFor(s.id)
                  const isActive = active === s.id
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setActive(s.id)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted',
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1 text-left">{s.label}</span>
                        {count > 0 ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]',
                              isActive
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : attention(s.id)
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-muted-foreground/15 text-muted-foreground',
                            )}
                          >
                            {count}
                          </Badge>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          <div className="mt-auto p-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent" />
              Website changes publish instantly
            </div>
          </div>
        </nav>

        {/* Mobile nav */}
        {mobileNavOpen ? (
          <div className="absolute left-0 right-0 top-0 z-10 border-b border-border bg-card p-2 shadow-md md:hidden">
            <div className="flex gap-1 overflow-x-auto scroll-area-thin">
              {ALL_SECTIONS.map((s) => {
                const Icon = s.icon
                const count = attention(s.id) ? badgeFor(s.id) : 0
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setActive(s.id)
                      setMobileNavOpen(false)
                    }}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                      active === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {s.label}
                    {count > 0 ? <span className="rounded-full bg-accent px-1.5 text-[10px] text-accent-foreground">{count}</span> : null}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 overflow-y-auto scroll-area-thin">
          <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
            {renderActive()}
          </div>
        </main>
      </div>

      <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Change password                                                   */
/* ------------------------------------------------------------------ */

function PasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [current, setCurrent] = React.useState('')
  const [next, setNext] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const mismatch = confirm.length > 0 && next !== confirm

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const res = await apiFetch('/api/admin/password', { method: 'POST', body: JSON.stringify({ current, next }) })
    setBusy(false)
    if (res.ok) {
      toast.success('Password changed')
      setCurrent('')
      setNext('')
      setConfirm('')
      onOpenChange(false)
    } else {
      toast.error(res.error || 'Could not change password')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change admin password</DialogTitle>
          <DialogDescription>Use at least 8 characters.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">Current password</Label>
            <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">New password</Label>
            <Input id="pw-new" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            {mismatch ? <p className="text-xs text-destructive">Passwords do not match</p> : null}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || mismatch || next.length < 8 || !current}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Change password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function sectionCount(id: SectionId, content: CmsContent): number {
  switch (id) {
    case 'banners':
      return content.banners.length
    case 'packages':
      return content.packages.length
    case 'tech':
      return content.techItems.length
    case 'benefits':
      return content.benefits.length
    case 'support':
      return content.supportChannels.length
    case 'coverage':
      return content.coverageAreas.length
    case 'stats':
      return content.stats.length
    case 'faqs':
      return content.faqs.length
    default:
      return 0
  }
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function SeedState({ onSeed, seeding }: { onSeed: () => void; seeding: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Database className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">No content yet</h2>
        <p className="text-sm text-muted-foreground">Seed the database with initial content to get started. You can edit everything afterwards.</p>
      </div>
      <Button onClick={onSeed} disabled={seeding}>
        {seeding ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
        {seeding ? 'Seeding…' : 'Seed initial content'}
      </Button>
    </div>
  )
}
