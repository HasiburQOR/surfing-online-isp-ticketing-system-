/* Shared helpers for CMS API routes */

import { slugify } from '@/lib/cms'

export function str(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  return String(v)
}

export function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function bool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === 'true' || v === '1'
  return fallback
}

export function strArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean)
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return v
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return []
}

/**
 * Accepts only site-relative paths, anchors and http(s) URLs — rejects
 * `javascript:` and other schemes. Returns '' when the value is unsafe.
 */
export function safeUrl(v: unknown): string {
  const s = str(v).trim()
  if (!s) return ''
  if (/^(https?:\/\/|\/(?!\/)|#)/i.test(s)) return s
  return ''
}

/** A number, or null for empty/invalid input. */
export function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Map position for a coverage area. Latitude and longitude must be given together
 * and be real coordinates; otherwise the area simply has no map pin.
 */
export function geoFields(
  body: Record<string, unknown> | null | undefined,
  existing?: { latitude: number | null; longitude: number | null; radiusMeters: number },
) {
  const has = (k: string) => body != null && k in body
  let latitude = has('latitude') ? numOrNull(body!.latitude) : (existing?.latitude ?? null)
  let longitude = has('longitude') ? numOrNull(body!.longitude) : (existing?.longitude ?? null)
  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    latitude = null
    longitude = null
  }
  const r = has('radiusMeters') ? numOrNull(body!.radiusMeters) : (existing?.radiusMeters ?? 600)
  const radiusMeters = Math.min(20000, Math.max(50, Math.round(r ?? 600)))
  return { latitude, longitude, radiusMeters }
}

export function makeSlug(name: string, existing?: string): string {
  return slugify(name) || existing || `area-${Date.now()}`
}

export function ok<T>(data: T) {
  return Response.json({ ok: true, data })
}

export function fail(msg: string, status = 400) {
  return Response.json({ ok: false, error: msg }, { status })
}
