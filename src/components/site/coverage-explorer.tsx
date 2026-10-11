'use client'

import * as React from 'react'
import type { Map as LeafletMap, CircleMarker, LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CoverageMapArea {
  id: string
  name: string
  description: string
  available: boolean
  latitude: number | null
  longitude: number | null
  radiusMeters: number
}

interface Pin {
  bounds: LatLngBounds
  dot: CircleMarker
}

/**
 * Street map (OpenStreetMap) with one circle per coverage area, next to the list of areas.
 * Areas without coordinates still appear in the list; if none have coordinates the map is hidden.
 */
export function CoverageExplorer({ areas }: { areas: CoverageMapArea[] }) {
  const mapEl = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletMap | null>(null)
  const pins = React.useRef<Map<string, Pin>>(new Map())
  const [selected, setSelected] = React.useState<string | null>(null)

  const located = areas.filter((a) => a.latitude != null && a.longitude != null)
  const hasMap = located.length > 0

  // Stable signature so the map is only rebuilt when the areas actually change.
  const signature = JSON.stringify(located.map((a) => [a.id, a.name, a.latitude, a.longitude, a.radiusMeters, a.available]))

  React.useEffect(() => {
    if (!hasMap || !mapEl.current) return
    let cancelled = false
    let observer: ResizeObserver | undefined

    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !mapEl.current) return

      const map = L.map(mapEl.current, {
        scrollWheelZoom: false, // don't hijack page scrolling; enabled once the map is clicked
        dragging: !L.Browser.mobile, // one-finger drag scrolls the page on phones
        zoomControl: true,
      })
      mapRef.current = map

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      map.on('click', () => map.scrollWheelZoom.enable())
      map.on('mouseout', () => map.scrollWheelZoom.disable())

      const group = L.featureGroup()
      const centre: [number, number] = [
        located.reduce((n, a) => n + (a.latitude as number), 0) / located.length,
        located.reduce((n, a) => n + (a.longitude as number), 0) / located.length,
      ]
      // Bounds are computed from coordinates + radius directly: a layer can't report
      // its own bounds until the map has a view, and the view is set from these bounds.
      let all: LatLngBounds | null = null
      pins.current.clear()
      for (const a of located) {
        const pos: [number, number] = [a.latitude as number, a.longitude as number]
        // 'currentColor' picks up the container's text colour (the site's accent colour).
        const style = a.available
          ? { color: 'currentColor', fillColor: 'currentColor', fillOpacity: 0.18, weight: 2 }
          : { color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 0.1, weight: 2, dashArray: '6 6' }
        const circle = L.circle(pos, { ...style, radius: a.radiusMeters }).addTo(group)
        const dot = L.circleMarker(pos, {
          ...style,
          radius: 6,
          fillOpacity: 0.95,
        }).addTo(group)

        // Put each label on the side facing away from the middle of all areas, so labels
        // of neighbouring areas spread out instead of piling on top of each other.
        const dLat = pos[0] - centre[0]
        const dLng = (pos[1] - centre[1]) * 0.9 // a degree of longitude is a bit shorter than one of latitude here
        const side: 'top' | 'bottom' | 'left' | 'right' =
          Math.abs(dLat) >= Math.abs(dLng) ? (dLat >= 0 ? 'top' : 'bottom') : dLng >= 0 ? 'right' : 'left'
        const offsets: Record<typeof side, [number, number]> = { top: [0, -8], bottom: [0, 8], left: [-8, 0], right: [8, 0] }
        dot.bindTooltip(a.available ? a.name : `${a.name} (coming soon)`, {
          permanent: true,
          direction: side,
          offset: offsets[side],
          className: 'coverage-label',
        })
        const popup = document.createElement('div')
        const title = document.createElement('strong')
        title.textContent = a.name
        popup.appendChild(title)
        if (a.description) {
          const p = document.createElement('p')
          p.style.margin = '4px 0 0'
          p.textContent = a.description
          popup.appendChild(p)
        }
        const status = document.createElement('p')
        status.style.margin = '4px 0 0'
        status.textContent = a.available ? '✓ Service available' : 'Coming soon'
        popup.appendChild(status)
        dot.bindPopup(popup)
        circle.bindPopup(popup)

        const select = () => setSelected(a.id)
        dot.on('click', select)
        circle.on('click', select)
        const bounds = L.latLng(pos).toBounds(a.radiusMeters * 2)
        all = all ? all.extend(bounds) : bounds
        pins.current.set(a.id, { bounds, dot })
      }
      // Set the view first, then add the layers.
      const fitAll = () => map.fitBounds((all as LatLngBounds).pad(0.25), { maxZoom: 16, animate: false })
      fitAll()
      group.addTo(map)

      // The container may still be settling (CSS, fonts, responsive layout) when the map is
      // created, so re-fit whenever it resizes - until the visitor starts moving the map.
      let touched = false
      const el = mapEl.current
      for (const ev of ['pointerdown', 'wheel', 'keydown'] as const) el.addEventListener(ev, () => (touched = true), { passive: true })
      observer = new ResizeObserver(() => {
        map.invalidateSize()
        if (!touched) fitAll()
      })
      observer.observe(el)
    })()

    return () => {
      cancelled = true
      observer?.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
      pins.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const focusArea = (a: CoverageMapArea) => {
    setSelected(a.id)
    const map = mapRef.current
    const pin = pins.current.get(a.id)
    if (!map || !pin) return
    map.flyToBounds(pin.bounds.pad(0.6), { maxZoom: 17, duration: 0.8 })
    pin.dot.openPopup()
    // On phones, bring the map into view when a list item is tapped.
    mapEl.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <div className={cn('mt-10 grid gap-6', hasMap ? 'lg:grid-cols-3' : 'max-w-2xl mx-auto')}>
      {hasMap ? (
        <div className="lg:col-span-2">
          <div
            ref={mapEl}
            role="region"
            aria-label="Map of the areas we cover"
            className="z-0 h-72 w-full overflow-hidden rounded-xl border border-border bg-muted text-accent shadow-sm sm:h-96 lg:h-full lg:min-h-[24rem]"
          />
        </div>
      ) : null}

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold text-foreground">Areas we serve</div>
        <div className="max-h-80 overflow-y-auto pr-1 scroll-area-thin">
          <ul className={cn('grid gap-2', hasMap ? 'grid-cols-1' : 'grid-cols-2')}>
            {areas.map((area) => {
              const clickable = hasMap && area.latitude != null && area.longitude != null
              const body = (
                <>
                  {area.available ? (
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  ) : (
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block font-medium text-foreground">{area.name}</span>
                    {area.description ? <span className="block text-muted-foreground">{area.description}</span> : null}
                    {!area.available ? <span className="block text-muted-foreground">Coming soon</span> : null}
                  </span>
                </>
              )
              const cls = cn(
                'flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-xs',
                selected === area.id ? 'border-accent bg-accent/10' : 'border-border bg-muted/40',
              )
              return (
                <li key={area.id}>
                  {clickable ? (
                    <button type="button" onClick={() => focusArea(area)} className={cn(cls, 'transition-colors hover:border-accent/60')}>
                      {body}
                    </button>
                  ) : (
                    <div className={cls}>{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Not on the list? Tell us where you are — we&apos;re expanding.</p>
        <Button variant="outline" className="mt-3 w-full" asChild>
          <a href="#lead-form">Check Your Area</a>
        </Button>
      </Card>
    </div>
  )
}
