import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Logo } from '@/components/ui/Logo'
import { NewsletterForm } from '@/components/marketing/NewsletterForm'

// lucide-react 1.x dropped brand icons over trademark concerns — inline SVGs keep us honest.
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21.95v-7.85h2.64l.4-3.07h-3.04V9.07c0-.89.25-1.5 1.52-1.5h1.62v-2.75a21.8 21.8 0 0 0-2.36-.12c-2.34 0-3.94 1.43-3.94 4.05v2.26H7.7v3.07h2.64v7.85a10 10 0 1 0 3.16 0Z" />
    </svg>
  )
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

const COLUMNS = ['Marketplace', 'Creators', 'Support'] as const

// Static links rendered first in each column; CMS-managed pages merge in
// after, deduped by href. Means the locked navigation structure can't be
// accidentally dropped if someone toggles a CMS page's showInFooter.
const FALLBACK: Record<typeof COLUMNS[number], { label: string; href: string }[]> = {
  Marketplace: [
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Fees & Payouts', href: '/fees-payouts' },
    { label: 'How Escrow Works', href: '/escrow' },
  ],
  Creators: [
    { label: 'Start Selling', href: '/start-selling' },
    { label: 'Creator Handbook', href: '/creator-handbook' },
    { label: 'Articles', href: '/blog' },
  ],
  Support: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'About noizu.direct', href: '/about' },
    { label: 'Help Centre', href: '/help' },
    { label: 'Contact Us', href: '/contact' },
  ],
}

type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement
const SOCIAL_LINKS: { icon: IconComponent; label: string; href: string; disabled?: boolean }[] = [
  { icon: FacebookIcon, label: 'Facebook', href: 'https://facebook.com/noizustudio' },
  { icon: InstagramIcon, label: 'Instagram (coming soon)', href: '#', disabled: true },
]

export default async function Footer() {
  const footerPages = await prisma.page.findMany({
    where: { showInFooter: true, status: 'PUBLISHED' },
    orderBy: [{ footerColumn: 'asc' }, { footerOrder: 'asc' }],
    select: { title: true, slug: true, footerColumn: true },
  })

  const columnMap: Record<string, { label: string; href: string }[]> = {}
  for (const col of COLUMNS) {
    const staticLinks = FALLBACK[col]
    const dbLinks = footerPages
      .filter((p) => p.footerColumn === col)
      .map((p) => ({ label: p.title, href: `/${p.slug}` }))

    const seen = new Set<string>()
    const merged: { label: string; href: string }[] = []
    for (const link of [...staticLinks, ...dbLinks]) {
      if (seen.has(link.href)) continue
      seen.add(link.href)
      merged.push(link)
    }
    columnMap[col] = merged
  }

  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ── Top: brand + newsletter + 3 link columns ──────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 mb-12">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center mb-3" aria-label="noizu.direct home">
              <Logo />
            </Link>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Your fave creators. Direct to you.
            </p>

            <NewsletterForm
              source="footer"
              variant="stacked"
              label="Newsletter"
              placeholder="you@example.com"
              buttonLabel="Subscribe"
              className="mb-5"
            />

            <ul className="flex items-center gap-2" aria-label="Follow us">
              {SOCIAL_LINKS.map(({ icon: Icon, label, href, disabled }) => (
                <li key={label}>
                  {disabled ? (
                    <span
                      aria-label={label}
                      title={label}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground/60 cursor-not-allowed"
                    >
                      <Icon width={16} height={16} aria-hidden="true" />
                    </span>
                  ) : (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      <Icon width={16} height={16} aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col}>
              <h3 className="text-sm font-semibold text-foreground mb-4">{col}</h3>
              <ul className="space-y-2.5">
                {columnMap[col].map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom: address + legal (single section) ──────────── */}
        <div className="border-t border-border pt-8">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-10 gap-y-4 items-start">
            {/* Address block */}
            <address className="not-italic text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <div className="font-semibold text-foreground mb-0.5">
                    ThinkBig Sdn. Bhd. <span className="font-normal text-muted-foreground">(200901036104)</span>
                  </div>
                  23, Jalan Putra Mahkota 7/4A, Pusat Bandar Putra Point<br />
                  Putra Heights 47650, Subang Jaya, Selangor, Malaysia
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Phone size={14} className="text-primary flex-shrink-0" aria-hidden="true" />
                <a href="tel:+60351916328" className="hover:text-foreground transition-colors">
                  +603 5191 6328
                </a>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Mail size={14} className="text-primary flex-shrink-0" aria-hidden="true" />
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Contact Us
                </Link>
              </div>
            </address>

            {/* Legal / trademark */}
            <p className="text-xs text-muted-foreground leading-relaxed md:border-l md:border-border md:pl-10">
              &copy; 2026 noizu.direct.{' '}
              <a
                href="https://noizu.asia"
                title="Noizu is Malaysia's home for cosplay, anime, gaming, and pop culture."
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Noizu&reg;
              </a>
              {' '}is a registered trademark owned by Thinkbig Sdn Bhd. All other logos,
              trademarks, and brand names mentioned are the property of their respective
              owners. Unauthorised use of these trademarks is strictly prohibited.
              &copy; 2026 Thinkbig Sdn Bhd. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
