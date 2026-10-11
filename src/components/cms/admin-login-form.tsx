'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Loader2, LogIn, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.ok) {
        router.replace('/admin')
        router.refresh()
      } else {
        setError(json.error || 'Login failed')
        setBusy(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-sm gap-5 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/surfing-online-logo.png" alt="Surfing Online" width={160} height={56} className="h-12 w-auto object-contain" priority />
          <div className="space-y-1">
            <h1 className="flex items-center justify-center gap-2 text-xl font-bold text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" /> Admin Login
            </h1>
            <p className="text-sm text-muted-foreground">Website, tickets, customers and connection requests.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Log in
          </Button>
        </form>
      </Card>
    </div>
  )
}
