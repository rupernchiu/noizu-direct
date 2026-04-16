import Link from 'next/link'
import { prisma } from '@/lib/prisma'

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
              <span className="text-xl font-bold text-white">NOIZU</span>
              <span className="text-xl font-bold text-secondary">-DIRECT</span>
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
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 NOIZU-DIRECT. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ♥ in Southeast Asia
          </p>
        </div>
      </div>
    </footer>
  )
}
