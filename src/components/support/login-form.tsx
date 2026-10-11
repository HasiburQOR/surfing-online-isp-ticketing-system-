'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SupportLoginForm() {
  const router = useRouter()
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/support/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.ok) {
        router.replace('/support/tickets')
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
    <div className="mx-auto max-w-md pt-4 sm:pt-12">
      <Card className="gap-5 p-6 sm:p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-foreground">Customer Login</h1>
          <p className="text-sm text-muted-foreground">
            Log in with the username and password given to you by Surfing Online to raise and track support tickets.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username / ID</Label>
            <Input
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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

        <p className="text-center text-xs text-muted-foreground">
          Forgot your password or don&apos;t have an account? Please contact our support team and we&apos;ll help you.
        </p>
      </Card>
    </div>
  )
}
