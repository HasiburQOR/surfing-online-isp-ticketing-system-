'use client'

import * as React from 'react'
import { Plus, Save, Trash2, X, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  slugify (client-safe)                                             */
/* ------------------------------------------------------------------ */

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/* ------------------------------------------------------------------ */
/*  useFieldState<T>                                                  */
/*  Deep JSON dirty tracking. Resyncs when initial value's JSON       */
/*  changes (e.g. after a server reload).                             */
/* ------------------------------------------------------------------ */

export function useFieldState<T>(initial: T): [T, (v: T) => void, boolean, () => void] {
  const initialJson = React.useMemo(() => JSON.stringify(initial), [initial])
  const [value, setValue] = React.useState<T>(initial)

  // Resync when the incoming initial value's JSON changes.
  React.useEffect(() => {
    setValue(initial)
  }, [initialJson])

  const isDirty = React.useMemo(() => {
    return JSON.stringify(value) !== initialJson
  }, [value, initialJson])

  const reset = React.useCallback(() => {
    setValue(JSON.parse(initialJson) as T)
  }, [initialJson])

  return [value, setValue, isDirty, reset]
}

/* ------------------------------------------------------------------ */
/*  Field — label + children wrapper                                  */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  children,
  htmlFor,
  className,
  hint,
}: {
  label: string
  children: React.ReactNode
  htmlFor?: string
  className?: string
  hint?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ItemCard                                                          */
/* ------------------------------------------------------------------ */

export function ItemCard({
  dirty,
  isNew,
  onSave,
  onDelete,
  onCancel,
  saving,
  children,
}: {
  dirty: boolean
  isNew?: boolean
  onSave?: () => void
  onDelete?: () => void
  onCancel?: () => void
  saving?: boolean
  children: React.ReactNode
}) {
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isNew ? (
            <Badge className="bg-accent text-accent-foreground">New</Badge>
          ) : null}
          {dirty && !isNew ? (
            <Badge variant="outline" className="border-primary/40 text-primary">
              Unsaved
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">{children}</div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {isNew ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              <X className="size-4" /> Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={saving || !dirty}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={saving}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={saving || !dirty}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  ListEditorShell                                                   */
/* ------------------------------------------------------------------ */

export function ListEditorShell({
  title,
  count,
  onAdd,
  addLabel,
  children,
}: {
  title: string
  count: number
  onAdd: () => void
  addLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <Badge variant="secondary" className="rounded-full">
            {count}
          </Badge>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="size-4" /> {addLabel}
        </Button>
      </header>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 scroll-area-thin">
        {children}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  API helper                                                        */
/* ------------------------------------------------------------------ */

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    })
    // Session expired (or never logged in): go back to the admin login.
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/admin/login'
    }
    const json = await res.json().catch(() => ({}))
    return json as { ok: boolean; data?: T; error?: string }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

/* ------------------------------------------------------------------ */
/*  EmptyState                                                        */
/* ------------------------------------------------------------------ */

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
