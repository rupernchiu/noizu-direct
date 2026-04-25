'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Receipt, BarChart3, Landmark } from 'lucide-react'

const TABS = [
  { href: '/admin/finance',           label: 'Operational', icon: Activity },
  { href: '/admin/finance/tax',       label: 'Tax & Compliance', icon: Receipt },
  { href: '/admin/finance/insights',  label: 'Insights & P&L', icon: BarChart3 },
  { href: '/admin/finance/treasury',  label: 'Treasury & Reserves', icon: Landmark },
]

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="space-y-4">
      <nav className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.href
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </Link>
          )
        })}
      </nav>
      <div>{children}</div>
    </div>
  )
}
