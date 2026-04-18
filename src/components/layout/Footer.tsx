import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Logo } from '@/components/ui/Logo'

const COLUMNS = ['Marketplace', 'Creators', 'Support'] as const

// Hardcoded fallback links shown when DB has no matching pages
const FALLBACK: Record<string, { label: string; href: string }[]> = {
  Marketplace: [
    { label: 'Browse Products', href: '/marketplace' },
    { label: 'Find Creators', href: '/creators' },
    { label: 'Fees & Pricing', href: '/fees' },
  ],
  Creators: [
    { label: 'Start Selling', href: '/register' },
  ],
  Support: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'About Us', href: '/about' },
    { label: 'Blog', href: '/blog' },
  ],
}

export default async function Footer() {
  const footerPages = await prisma.page.findMany({
    where: { showInFooter: true, status: 'PUBLISHED' },
    orderBy: [{ footerColumn: 'asc' }, { footerOrder: 'asc' }],
    select: { title: true, slug: true, footerColumn: true, footerOrder: true },
  })

  // Build column map from DB pages, falling back to hardcoded links
  const columnMap: Record<string, { label: string; href: string }[]> = {}
  for (const col of COLUMNS) {
    const dbLinks = footerPages
      .filter((p) => p.footerColumn === col)
      .map((p) => ({ label: p.title, href: `/${p.slug}` }))
    columnMap[col] = dbLinks.length > 0 ? dbLinks : FALLBACK[col] ?? []
  }

  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Logo + tagline */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center mb-3">
              <Logo />
            </Link>
            <p className="text-sm text-muted-foreground">Your fave creators. Direct to you.</p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col}>
              <h3 className="text-sm font-semibold text-foreground mb-4">{col}</h3>
              <ul className="space-y-2">
                {columnMap[col].map(({ label, href }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground leading-relaxed">
            &copy; 2026 noizu.direct.{' '}
            <a href="https://noizu.asia" title="Noizu is Malaysia's home for cosplay, anime, gaming, and pop culture." target="_blank" rel="noopener noreferrer" className="hover:underline">Noizu&reg;</a>
            {' '}is a registered trademark owned by Thinkbig Sdn Bhd. All other logos, trademarks, and brand names mentioned are the property of their respective owners. Unauthorised use of these trademarks is strictly prohibited. &copy; 2026 Thinkbig Sdn Bhd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
