import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import sanitizeHtml from 'sanitize-html'
import {
  ArrowUpRight,
  Clock,
  Mail,
  Download,
  Package,
  Printer,
  Palette,
  ShieldCheck,
  Percent,
  Receipt,
  TrendingUp,
  CircleDollarSign,
  Gavel,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The agreement between noizu.direct and the buyers, creators, and visitors who use the platform.',
  alternates: { canonical: 'https://noizu.direct/terms' },
  robots: { index: true, follow: false },
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  // `u` — StarterKit's Underline emits <u>, missing from sanitize-html defaults.
  // `style` + allowedStyles — TipTap TextAlign writes inline `style="text-align:…"`;
  // without explicit allow, alignment silently disappears on the published page.
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img', 'figure', 'figcaption', 'iframe', 'u', 'h1', 'h2', 'h3', 'h4',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height', 'class'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'class'],
    '*': ['class', 'id', 'style'],
  },
  allowedStyles: {
    '*': { 'text-align': [/^(left|right|center|justify)$/] },
  },
  allowedIframeHostnames: ['www.youtube.com', 'www.facebook.com'],
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&(mdash|ndash|amp|quot|apos|nbsp|#\d+);/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Walk the sanitized HTML, extract <h2> text for the TOC, and inject
 * id anchors so the TOC links scroll. Sections without extractable
 * text fall back to a positional id.
 */
function extractSectionsAndAnchor(html: string): {
  processed: string
  sections: { id: string; text: string }[]
} {
  const sections: { id: string; text: string }[] = []
  const processed = html.replace(
    /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi,
    (_full, attrs: string | undefined, inner: string) => {
      const text = inner
        .replace(/<[^>]+>/g, '')
        .replace(/&(mdash|ndash|amp|quot|apos|nbsp);/g, (m) =>
          m === '&amp;' ? '&' : ' '
        )
        .trim()
      const id = slugify(text) || `section-${sections.length + 1}`
      sections.push({ id, text })
      const existingAttrs = (attrs ?? '').replace(/\sid="[^"]*"/i, '')
      return `<h2 id="${id}"${existingAttrs}>${inner}</h2>`
    }
  )
  return { processed, sections }
}

const FEE_TILES = [
  {
    icon: Percent,
    label: 'Platform commission',
    value: '5%',
    detail: 'Deducted from Creator earnings on every completed order. Applies to all rails and product types.',
    tone: 'primary' as const,
  },
  {
    icon: Receipt,
    label: 'Buyer fee — local rails',
    value: '+5.5%',
    detail: 'FPX, DuitNow, TouchnGo, GCash, PayNow, FAST, BI-FAST, PromptPay, InstaPay. Lowest checkout cost.',
    tone: 'accent' as const,
  },
  {
    icon: Receipt,
    label: 'Buyer fee — cards',
    value: '+8%',
    detail: 'Visa / Mastercard / Amex (any geography). Covers gateway, FX spread, and chargeback exposure.',
    tone: 'primary' as const,
  },
  {
    icon: TrendingUp,
    label: 'Chargeback / clawback',
    value: '120-day exposure',
    detail: 'Amounts from the last 120 days remain exposed and may be deducted from a Creator balance if a chargeback is upheld.',
    tone: 'accent' as const,
  },
] as const

const ESCROW_TIMELINE = [
  {
    icon: Download,
    label: 'Digital goods',
    release: '7 days or first download',
    detail: 'Released at the Buyer’s first successful download, or seven days after purchase — whichever comes first.',
  },
  {
    icon: Package,
    label: 'Physical goods',
    release: '48h after tracked delivery',
    detail: 'Released when a tracked shipment is confirmed delivered, plus a 48-hour Buyer confirmation window.',
  },
  {
    icon: Palette,
    label: 'Commissioned works',
    release: '14 days or Buyer acceptance',
    detail: 'Released when the Buyer marks the commission as accepted, or 14 days after Seller marks it delivered.',
  },
] as const

const PRODUCT_TYPES = [
  {
    icon: Download,
    title: 'Digital',
    body: 'Original digital files delivered via signed URL. No physical inventory, no shipping.',
  },
  {
    icon: Package,
    title: 'Physical',
    body: 'Items shipped directly by the Seller. Seller is responsible for dispatch and tracking.',
  },
  {
    icon: Printer,
    title: 'Print-on-demand',
    body: 'Fulfilled through integrated POD partners. Seller sets the design; partner prints & ships.',
  },
  {
    icon: Palette,
    title: 'Commission',
    body: 'Bespoke work with staged escrow release. Revisions and timeline defined in the listing.',
  },
] as const

function formatUpdated(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function estimateReadingMinutes(html: string | null | undefined): number {
  if (!html) return 1
  const words = html
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

export default async function TermsPage() {
  const page = await prisma.page.findUnique({ where: { slug: 'terms' } })

  const title = page?.title ?? 'Terms of Service'
  const rawContent = page?.content
  const safeContent = rawContent ? sanitizeHtml(rawContent, SANITIZE_OPTIONS) : null
  const { processed, sections } = safeContent
    ? extractSectionsAndAnchor(safeContent)
    : { processed: null as string | null, sections: [] as { id: string; text: string }[] }

  const updatedAt = page?.updatedAt ?? new Date('2026-04-22')
  const updatedStr = formatUpdated(updatedAt)
  const readingMinutes = estimateReadingMinutes(rawContent)

  // This project runs Tailwind 4 WITHOUT @tailwindcss/typography installed,
  // so `prose`, `prose-invert`, and every `prose-h2:*`/`prose-p:*`/etc.
  // modifier is a silent no-op — they emit zero CSS. Heading hierarchy and
  // reading rhythm therefore have to be built entirely from core-Tailwind
  // arbitrary descendant selectors (`[&_h2]:…`).
  //
  // Heading sizes and weights intentionally mirror the TipTap editor
  // (TipTapEditor.tsx) so what the CMS author sees is what the public page
  // renders — WYSIWYG. TOC numbering happens in the sidebar JSX, not inline
  // on the headings, so we deliberately don't use CSS counters here.
  const proseClasses = [
    'max-w-none text-foreground font-sans',
    // H1 — rare inside body (page hero owns H1) but style defensively.
    '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-foreground',
    '[&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:leading-[1.2]',
    // H2 — section headings. Match editor: text-2xl / font-bold.
    '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground',
    '[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:scroll-mt-28 [&_h2]:leading-[1.3]',
    '[&_h2:first-of-type]:mt-6',
    // H3 — subsection. Match editor: text-xl / font-semibold.
    '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-7 [&_h3]:mb-2',
    '[&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-6 [&_h4]:mb-2',
    // Body
    '[&_p]:text-foreground [&_p]:leading-[1.7] [&_p]:my-4 [&_p]:text-[16px]',
    '[&_strong]:text-foreground [&_strong]:font-semibold',
    '[&_em]:text-muted-foreground [&_em]:italic',
    '[&_u]:underline [&_u]:underline-offset-2',
    // Links
    '[&_a]:text-primary [&_a]:font-medium [&_a]:underline [&_a]:decoration-primary/30 hover:[&_a]:decoration-primary [&_a]:underline-offset-[3px]',
    // Lists
    '[&_ul]:my-4 [&_ol]:my-4 [&_ul]:pl-5 [&_ol]:pl-5',
    '[&_ul]:list-disc [&_ol]:list-decimal',
    '[&_li]:text-foreground [&_li]:my-1.5 [&_li]:leading-[1.7] [&_li]:text-[16px]',
    '[&_li]:marker:text-muted-foreground',
    // Summary blockquote — subtle gray card with primary accent
    '[&_blockquote]:not-italic [&_blockquote]:font-normal',
    '[&_blockquote]:border-0 [&_blockquote]:border-l-[3px] [&_blockquote]:border-l-primary',
    '[&_blockquote]:bg-muted/50 [&_blockquote]:px-6 [&_blockquote]:py-5',
    '[&_blockquote]:rounded-r-lg',
    '[&_blockquote]:my-8 [&_blockquote]:text-foreground',
    '[&_blockquote]:text-[15px] [&_blockquote]:leading-[1.7]',
    // Inline code + code blocks
    '[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[14px]',
    '[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-5 [&_pre]:overflow-x-auto',
    '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
    // hr
    '[&_hr]:border-border [&_hr]:my-10',
    // Images inserted via TipTap
    '[&_img]:rounded-lg [&_img]:my-6 [&_img]:max-w-full [&_img]:h-auto',
  ].join(' ')

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative border-b border-border overflow-hidden">
        {/* Subtle radial brand wash */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% -20%, rgba(124,58,237,0.10), transparent 60%)',
          }}
        />
        {/* Fine dot grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-14 pb-12 sm:pt-20 sm:pb-14">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-8">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="text-primary">Legal</span>
            <span className="w-8 h-px bg-border" aria-hidden="true" />
            <span>Terms of Service</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-foreground max-w-3xl leading-[1.1]">
            {title}
          </h1>

          {/* Sub */}
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-[1.65]">
            The agreement between noizu.direct and the buyers, creators, and
            visitors who use the platform. Please read these Terms in full
            before creating an account or completing a purchase.
          </p>

          {/* Meta row */}
          <div className="mt-10 pt-5 border-t border-border flex flex-wrap items-center gap-x-10 gap-y-3 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Effective</span>
              <span className="font-medium text-foreground">{updatedStr}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Version</span>
              <span className="font-mono text-sm font-medium text-foreground">1.0</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-muted-foreground" aria-hidden="true" />
              <span className="font-medium text-foreground">{readingMinutes} min read</span>
            </div>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Privacy Policy
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Fee structure ────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 text-primary"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <CircleDollarSign size={12} aria-hidden="true" />
              Fees at a glance
            </span>
            <h2 id="fees-summary" className="text-2xl sm:text-3xl font-extrabold text-foreground scroll-mt-28">
              What you pay, and what it pays for
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Detailed terms live in the <em>Fees</em> section below — these tiles are the headline numbers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEE_TILES.map(({ icon: Icon, label, value, detail, tone }) => (
              <div
                key={label}
                className="rounded-2xl border bg-card p-6"
                style={{
                  borderColor: tone === 'accent' ? 'rgba(13,148,136,0.35)' : 'rgba(124,58,237,0.35)',
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: tone === 'accent' ? 'rgba(13,148,136,0.10)' : 'rgba(124,58,237,0.10)',
                  }}
                >
                  <Icon
                    size={20}
                    style={{ color: tone === 'accent' ? '#0d9488' : '#7c3aed' }}
                    aria-hidden="true"
                  />
                </div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-1"
                  style={{ color: tone === 'accent' ? '#0d9488' : '#7c3aed' }}
                >
                  {label}
                </p>
                <p className="text-2xl font-extrabold text-foreground mb-2 leading-none">{value}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>

          {/* ── Creator clawback notice ─────────────────────────── */}
          <div
            id="creator-clawback"
            className="mt-12 rounded-2xl border border-amber-500/35 bg-amber-50/60 dark:bg-amber-500/5 p-6 sm:p-7 scroll-mt-28"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(217,119,6,0.10)' }}
              >
                <Gavel size={20} style={{ color: '#b45309' }} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                  Chargeback &amp; Clawback Clause (Creators)
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By accepting payouts on noizu.direct, the Creator agrees that the platform retains
                  the right to claw back any amount paid to the Creator if the corresponding buyer
                  payment is later reversed by a card network, bank, or payment provider — including
                  chargebacks, fraud reversals, and ACH/IBG returns. This right applies for{' '}
                  <strong className="text-foreground">120 days</strong> from the original order date,
                  matching the longest standard card-network dispute window.
                </p>
                <ul className="mt-3 text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1.5">
                  <li>
                    Earnings from the last 120 days are shown in your dashboard as{' '}
                    <em>“Exposed”</em> and are not yet eligible for payout.
                  </li>
                  <li>
                    If a chargeback is upheld against an order, the disputed amount is deducted from the
                    Creator&apos;s balance. If the balance is insufficient, the Creator owes the platform
                    that amount and future payouts are withheld until cleared.
                  </li>
                  <li>
                    The platform does <strong className="text-foreground">not</strong> reimburse Creators for
                    fraud losses on chargebacks. This is industry standard across PayPal, Stripe Connect,
                    Gumroad, Patreon, OnlyFans, Etsy, Fiverr, and Upwork.
                  </li>
                  <li>
                    Successfully won disputes (via Airwallex evidence submission) release the held amount
                    back to the Creator&apos;s available balance.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── Tax disclaimer ─────────────────────────────────── */}
          <div
            id="tax-disclaimer"
            className="mt-6 rounded-2xl border border-sky-500/35 bg-sky-50/60 dark:bg-sky-500/5 p-6 sm:p-7 scroll-mt-28"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(2,132,199,0.10)' }}
              >
                <Receipt size={20} style={{ color: '#0284c7' }} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                  Tax Disclosure (Creators &amp; Buyers)
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  noizu.direct currently operates as a marketplace agent. Sales tax / GST / VAT is not
                  collected at checkout while the platform is below each country&apos;s registration
                  threshold. As GMV grows and crosses a country&apos;s threshold, that
                  country&apos;s buyers will see a separate tax line at checkout — applied only to
                  buyers in that country.
                </p>
                <ul className="mt-3 text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1.5">
                  <li>
                    <strong className="text-foreground">Creators</strong> are responsible for declaring
                    and paying their own personal income / business tax in their country of residence.
                    Self-declared “tax-registered” Creators may opt into platform-managed
                    markup-and-withhold; otherwise, no tax is added or deducted.
                  </li>
                  <li>
                    <strong className="text-foreground">Buyers</strong> see prices in USD and a local
                    conversion at checkout. The FX rate is locked at PaymentIntent creation; the
                    converted amount displayed is what the rail will charge.
                  </li>
                  <li>
                    Country thresholds tracked per the published roadmap: MY SST RM 500k @ 8%, SG GST
                    S$100k @ 9%, ID PPN IDR 600M @ 11%, TH VAT THB 1.8M @ 7%, PH VAT PHP 3M @ 12%.
                  </li>
                  <li>
                    Once a country crosses its registration threshold, this clause and the checkout flow
                    update with at least 14 days&apos; notice before tax collection begins for that
                    country&apos;s buyers.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── SWIFT fee passthrough ──────────────────────────── */}
          <div
            id="swift-fees"
            className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-7 scroll-mt-28"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
              >
                <CircleDollarSign size={20} className="text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                  SWIFT Payouts (Tier-3 Creator Countries)
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Creators in countries served only by SWIFT (currently Vietnam, Cambodia, Myanmar, and
                  Laos) are paid via SWIFT international wire. SWIFT corridor fees — sender bank fee,
                  intermediary bank fee (where applicable), and beneficiary bank fee — are passed through
                  transparently to the Creator and shown at payout-method setup. Minimum SWIFT payout is{' '}
                  <strong className="text-foreground">USD 100</strong> to keep per-transaction fees below
                  ~5% of the payout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Escrow timeline ──────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 text-primary"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <ShieldCheck size={12} aria-hidden="true" />
              Escrow release
            </span>
            <h2 id="escrow-release-summary" className="text-2xl sm:text-3xl font-extrabold text-foreground scroll-mt-28">
              When payments are released to creators
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Every order is escrow-protected. Funds release on the schedule below, or sooner if
              the Buyer confirms delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ESCROW_TIMELINE.map(({ icon: Icon, label, release, detail }, i) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: i % 2 === 0 ? 'rgba(124,58,237,0.10)' : 'rgba(13,148,136,0.10)',
                    }}
                  >
                    <Icon
                      size={20}
                      style={{ color: i % 2 === 0 ? '#7c3aed' : '#0d9488' }}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {label}
                    </p>
                    <p className="text-sm font-bold text-foreground">{release}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product types ────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Product types
            </span>
            <h2 id="product-types-summary" className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2 scroll-mt-28">
              Four ways creators sell on the platform
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PRODUCT_TYPES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5 flex flex-col">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                >
                  <Icon size={18} className="text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Body: sidebar + content ──────────────────────────────
           Narrow article column (~680px) for comfortable 70-char
           reading length. Sidebar stays slim. Extra grid space on
           wide screens trails to the right — intentional Etsy-style. */}
      <section className="bg-muted/40 border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mb-10">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              The detail
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Full terms of service
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              The complete agreement between noizu.direct and every user of the platform.
            </p>
          </div>
        </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,680px)] gap-10 lg:gap-16">

        {/* Desktop sticky TOC */}
        {sections.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-5">
                Contents
              </p>
              <nav aria-label="Table of contents">
                <ol className="space-y-0.5 text-sm">
                  {sections.map((s, idx) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="group flex items-start gap-2 py-1.5 px-3 -mx-3 rounded-lg hover:bg-muted/60 transition-colors"
                      >
                        <span className="text-muted-foreground group-hover:text-primary font-medium min-w-[18px] leading-snug">
                          {idx + 1}.
                        </span>
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
                          {s.text}
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </aside>
        )}

        {/* Mobile collapsible TOC */}
        {sections.length > 0 && (
          <details className="lg:hidden rounded-xl border border-border bg-card overflow-hidden group">
            <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none list-none">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-foreground">
                Contents
              </span>
              <span className="text-xs text-muted-foreground group-open:hidden">
                {sections.length} sections
              </span>
              <span
                aria-hidden="true"
                className="text-muted-foreground transition-transform group-open:rotate-180"
              >
                ▾
              </span>
            </summary>
            <ol className="px-2 pb-3 text-sm">
              {sections.map((s, idx) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-start gap-2 py-2 px-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
                  >
                    <span className="font-medium min-w-[18px]">
                      {idx + 1}.
                    </span>
                    <span>{s.text}</span>
                  </a>
                </li>
              ))}
            </ol>
          </details>
        )}

        {/* Main content */}
        <article className="min-w-0">
          {processed ? (
            <div
              className={proseClasses}
              dangerouslySetInnerHTML={{ __html: processed }}
            />
          ) : (
            <div className={proseClasses}>
              <blockquote>
                <p>
                  <strong>Summary.</strong> noizu.direct is a marketplace
                  connecting Southeast Asian creators with buyers. Payments
                  are held in escrow and released only after delivery has been
                  confirmed.
                </p>
              </blockquote>
              <p>
                The full Terms have not yet been published. For specific
                questions, please contact{' '}
                <a href="mailto:support@noizu.direct">support@noizu.direct</a>.
              </p>
            </div>
          )}

          {/* Contact block */}
          <div className="mt-24 pt-10 border-t border-border">
            <div className="flex items-start gap-6 sm:gap-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(124,58,237,0.08)' }}
              >
                <Mail size={20} className="text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-3">
                  Questions, notices, or reports
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                  Written correspondence relating to these Terms may be directed
                  to the addresses below. We aim to respond to all enquiries
                  within two (2) business days.
                </p>
                <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 text-sm">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      General enquiries
                    </dt>
                    <dd>
                      <a
                        href="mailto:support@noizu.direct"
                        className="text-primary font-medium hover:underline underline-offset-4 break-all"
                      >
                        support@noizu.direct
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      Legal &amp; IP
                    </dt>
                    <dd>
                      <a
                        href="mailto:legal@noizu.direct"
                        className="text-primary font-medium hover:underline underline-offset-4 break-all"
                      >
                        legal@noizu.direct
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      Trust &amp; safety
                    </dt>
                    <dd>
                      <a
                        href="mailto:abuse@noizu.direct"
                        className="text-primary font-medium hover:underline underline-offset-4 break-all"
                      >
                        abuse@noizu.direct
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Legal footer metadata */}
          <div className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono uppercase tracking-[0.2em] text-foreground">noizu.direct</span>
            <span aria-hidden="true">·</span>
            <span>Operating from Kuala Lumpur, Malaysia</span>
            <span aria-hidden="true">·</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved</span>
          </div>
        </article>
      </div>
      </section>
    </div>
  )
}
