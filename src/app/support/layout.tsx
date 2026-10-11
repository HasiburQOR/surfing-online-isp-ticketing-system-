import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCustomer } from '@/lib/auth'
import { SupportLogoutButton } from '@/components/support/logout-button'

export const metadata: Metadata = {
  title: 'Support Portal',
  robots: { index: false, follow: false },
}

export default async function SupportLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCustomer()

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/support" className="flex items-center gap-3" aria-label="Support portal home">
            <Image src="/surfing-online-logo.png" alt="Surfing Online" width={160} height={56} className="h-11 w-auto object-contain" priority />
            <span className="hidden border-l border-border pl-3 text-sm font-semibold text-muted-foreground sm:inline">
              Support Portal
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {customer ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {customer.fullName || customer.username}
                </span>
                <SupportLogoutButton />
              </>
            ) : null}
            <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to website</span>
              <span className="sm:hidden">Website</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  )
}
