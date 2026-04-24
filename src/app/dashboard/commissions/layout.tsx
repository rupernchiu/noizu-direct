'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Palette } from 'lucide-react'

const TABS = [
  { href: '/dashboard/commissions',               label: 'Inbox' },
  { href: '/dashboard/commissions/settings',      label: 'Settings' },
  { href: '/dashboard/commissions/how-it-works',  label: 'How it works' },
] as const

export default function CommissionsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/dashboard/commissions') {
      return pathname === '/dashboard/commissions'
        || pathname.startsWith('/dashboard/commissions/requests')
        || pathname.startsWith('/dashboard/commissions/quotes')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Palette className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commission</h1>
          <p className="text-sm text-muted-foreground">Incoming requests, quotes, and your commission setup.</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(t => {
          const active = isActive(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </Link>
          )
        })}
      </div>

      <div>{children}</div>
    </div>
  )
}
