'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { SiteSettingData } from '@/lib/cms'
import { useFieldState, Field, apiFetch } from './_shared'

const NEWLINE = String.fromCharCode(10)

/* ------------------------------------------------------------------ */
/*  Group wrapper                                                    */
/* ------------------------------------------------------------------ */

function Group({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-4 p-5">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  SettingsEditor                                                    */
/* ------------------------------------------------------------------ */

export function SettingsEditor({
  settings,
  reload,
}: {
  settings: SiteSettingData | null
  reload: () => void
}) {
  const initial: SiteSettingData = React.useMemo(() => {
    return (
      settings ?? {
        id: 'default',
        brandName: '',
        brandTagline: '',
        heroEyebrow: '',
        heroTitle: '',
        heroAccent: '',
        heroSubtitle: '',
        primaryCta: '',
        secondaryCta: '',
        phone: '',
        whatsapp: '',
        email: '',
        address: '',
        portalUrl: '',
        payUrl: '',
        metaTitle: '',
        metaDescription: '',
        heroBadges: [],
      }
    )
  }, [settings])

  const [value, set, isDirty, reset] = useFieldState<SiteSettingData>(initial)
  const [saving, setSaving] = React.useState(false)

  const update = <K extends keyof SiteSettingData>(k: K, v: SiteSettingData[K]) => {
    set({ ...value, [k]: v })
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await apiFetch<{ settings: SiteSettingData }>(
      '/api/cms/settings',
      {
        method: 'PUT',
        body: JSON.stringify(value),
      },
    )
    setSaving(false)
    if (res.ok) {
      toast.success('Settings saved')
      reload()
    } else {
      toast.error(res.error || 'Failed to save settings')
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Site Settings</h2>
          {isDirty ? (
            <Badge variant="outline" className="border-primary/40 text-primary">
              Unsaved
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={saving || !isDirty}
          >
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save changes
          </Button>
        </div>
      </header>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 scroll-area-thin">
        <Group title="Brand" description="Identity shown across the site.">
          <Field label="Brand name" htmlFor="brandName">
            <Input
              id="brandName"
              value={value.brandName}
              onChange={(e) => update('brandName', e.target.value)}
              placeholder="Surfing Online"
            />
          </Field>
          <Field label="Brand tagline" htmlFor="brandTagline">
            <Input
              id="brandTagline"
              value={value.brandTagline}
              onChange={(e) => update('brandTagline', e.target.value)}
              placeholder="ISP Bangladesh"
            />
          </Field>
        </Group>

        <Group title="Hero" description="Top-of-page headline block.">
          <Field label="Hero eyebrow" htmlFor="heroEyebrow">
            <Input
              id="heroEyebrow"
              value={value.heroEyebrow}
              onChange={(e) => update('heroEyebrow', e.target.value)}
              placeholder="Fastest Fiber in Town"
            />
          </Field>
          <Field label="Hero title" htmlFor="heroTitle" className="md:col-span-2">
            <Input
              id="heroTitle"
              value={value.heroTitle}
              onChange={(e) => update('heroTitle', e.target.value)}
              placeholder="Blazing-fast fiber internet for every home & business in"
            />
          </Field>
          <Field label="Hero accent" htmlFor="heroAccent">
            <Input
              id="heroAccent"
              value={value.heroAccent}
              onChange={(e) => update('heroAccent', e.target.value)}
              placeholder="Bangladesh."
            />
          </Field>
          <Field label="Hero subtitle" htmlFor="heroSubtitle" className="md:col-span-2">
            <Textarea
              id="heroSubtitle"
              rows={3}
              value={value.heroSubtitle}
              onChange={(e) => update('heroSubtitle', e.target.value)}
              placeholder="Truly unlimited fiber broadband with 99.9% uptime…"
            />
          </Field>
          <Field
            label="Trust points under the hero buttons"
            htmlFor="heroBadges"
            className="md:col-span-2"
            hint="One per line, e.g. “No hidden charges”. Shown with a tick under the buttons. Leave empty to hide them."
          >
            <Textarea
              id="heroBadges"
              rows={4}
              value={(value.heroBadges ?? []).join(NEWLINE)}
              onChange={(e) => update('heroBadges', e.target.value.split(NEWLINE))}
              placeholder={['No hidden charges', 'Free installation', 'Cancel anytime'].join(NEWLINE)}
            />
          </Field>
        </Group>

        <Group title="CTA" description="Primary call-to-action buttons.">
          <Field label="Primary CTA" htmlFor="primaryCta">
            <Input
              id="primaryCta"
              value={value.primaryCta}
              onChange={(e) => update('primaryCta', e.target.value)}
              placeholder="View Packages"
            />
          </Field>
          <Field label="Secondary CTA" htmlFor="secondaryCta">
            <Input
              id="secondaryCta"
              value={value.secondaryCta}
              onChange={(e) => update('secondaryCta', e.target.value)}
              placeholder="Check Coverage"
            />
          </Field>
        </Group>

        <Group title="Contact" description="How customers reach support.">
          <Field label="Phone" htmlFor="phone">
            <Input
              id="phone"
              value={value.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="16XXX"
            />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp">
            <Input
              id="whatsapp"
              value={value.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
              placeholder="+880 1XXX-XXXXXX"
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={value.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="support@surfingonline.bd"
            />
          </Field>
          <Field label="Address" htmlFor="address">
            <Input
              id="address"
              value={value.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Dhaka, Bangladesh"
            />
          </Field>
        </Group>

        <Group title="Portal / Pay" description="Customer portal & billing links.">
          <Field label="Portal URL" htmlFor="portalUrl">
            <Input
              id="portalUrl"
              value={value.portalUrl}
              onChange={(e) => update('portalUrl', e.target.value)}
              placeholder="https://portal.surfingonline.bd"
            />
          </Field>
          <Field label="Pay URL" htmlFor="payUrl">
            <Input
              id="payUrl"
              value={value.payUrl}
              onChange={(e) => update('payUrl', e.target.value)}
              placeholder="https://pay.surfingonline.bd"
            />
          </Field>
        </Group>

        <Group title="SEO" description="Default meta tags for search engines.">
          <Field label="Meta title" htmlFor="metaTitle" className="md:col-span-2">
            <Input
              id="metaTitle"
              value={value.metaTitle}
              onChange={(e) => update('metaTitle', e.target.value)}
              placeholder="Surfing Online - Fast Fiber Internet Across Bangladesh"
            />
          </Field>
          <Field label="Meta description" htmlFor="metaDescription" className="md:col-span-2">
            <Textarea
              id="metaDescription"
              rows={3}
              value={value.metaDescription}
              onChange={(e) => update('metaDescription', e.target.value)}
              placeholder="Surfing Online brings fast, reliable fiber internet…"
            />
          </Field>
        </Group>
      </div>
    </section>
  )
}
