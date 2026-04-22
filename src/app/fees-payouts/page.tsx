import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Percent,
  Receipt,
  Wallet,
  Download,
  Package,
  Printer,
  Palette,
  ShieldCheck,
  Clock,
  CircleDollarSign,
  RefreshCw,
  Tag,
  CheckCircle2,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Fees & Payouts | noizu.direct',
  description:
    'Flat 5% platform fee. 2.5% buyer processing. No listing fees, no subscriptions, no surprises. 0% during launch through 31 October 2026.',
  alternates: { canonical: 'https://noizu.direct/fees-payouts' },
  openGraph: {
    title: 'Fees & Payouts | noizu.direct',
    description:
      'One number to remember: 5%. Buyer pays 2.5% processing. Zero during launch.',
    url: 'https://noizu.direct/fees-payouts',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'noizu.direct Fees & Payouts' }],
  },
}

/* ────────────────────────────────────────────────────────────────
 * Numbers live here. Change once, everywhere updates.
 * All values are placeholders until final policy is set before launch.
 * ───────────────────────────────────────────────────────────── */

const PLATFORM_FEE_PCT = 5       // creator pays on sale
const PROCESSING_FEE_PCT = 2.5   // buyer pays at checkout
const LAUNCH_FEE_PCT = 0         // creator pays during launch
const LAUNCH_END_DATE = '31 October 2026'
const LAUNCH_CREATOR_CAP = 100

/* ────────────────────────────────────────────────────────────────
 * Data
 * ───────────────────────────────────────────────────────────── */

const HERO_PILLS: { icon: LucideIcon; label: string }[] = [
  { icon: Percent, label: 'Flat 5% — no tiers' },
  { icon: CalendarClock, label: `0% until ${LAUNCH_END_DATE}` },
  { icon: ShieldCheck, label: 'Escrow-protected' },
]

const CHEAT_SHEET: { icon: LucideIcon; label: string; value: string; hint: string }[] = [
  { icon: Percent, label: 'Platform', value: `${PLATFORM_FEE_PCT}%`, hint: 'Creator, per sale' },
  { icon: Receipt, label: 'Processing', value: `${PROCESSING_FEE_PCT}%`, hint: 'Buyer, at checkout' },
  { icon: Tag, label: 'Listing fee', value: 'None', hint: 'List as many as you want' },
  { icon: Wallet, label: 'Payouts', value: 'Weekly', hint: 'Mon–Fri bank transfer' },
]

// Where RM100 goes — the flow visual.
// Buyer pays RM102.50. Creator receives RM95 after platform fee (pre-launch: RM100).
const FLOW_BARS: {
  label: string
  amount: string
  note: string
  pct: number
  fg: string
  bg: string
}[] = [
  {
    label: 'Creator receives',
    amount: 'RM 95.00',
    note: `After ${PLATFORM_FEE_PCT}% platform fee`,
    pct: 95,
    fg: '#0d9488',
    bg: 'linear-gradient(90deg, rgba(13,148,136,0.95), rgba(6,182,212,0.95))',
  },
  {
    label: 'Platform fee',
    amount: 'RM 5.00',
    note: `${PLATFORM_FEE_PCT}% · keeps the lights on`,
    pct: 5,
    fg: '#7c3aed',
    bg: 'linear-gradient(90deg, rgba(124,58,237,0.95), rgba(91,33,182,0.95))',
  },
  {
    label: 'Processing (buyer adds)',
    amount: 'RM 2.50',
    note: `${PROCESSING_FEE_PCT}% · Airwallex / Stripe`,
    pct: 2.5,
    fg: '#b45309',
    bg: 'linear-gradient(90deg, rgba(245,158,11,0.90), rgba(217,119,6,0.90))',
  },
]

const PRODUCT_FEES: {
  icon: LucideIcon
  code: string
  name: string
  creatorFee: string
  note: string
  tone: 'purple' | 'teal' | 'amber' | 'pink'
}[] = [
  { icon: Download, code: 'DIGITAL', name: 'Digital', creatorFee: `${PLATFORM_FEE_PCT}%`, note: 'No shipping cost', tone: 'purple' },
  { icon: Package,  code: 'PHYSICAL', name: 'Physical', creatorFee: `${PLATFORM_FEE_PCT}%`, note: 'Shipping billed separately', tone: 'teal' },
  { icon: Printer,  code: 'POD', name: 'Print-on-demand', creatorFee: `${PLATFORM_FEE_PCT}%`, note: 'Partner print cost passthrough', tone: 'amber' },
  { icon: Palette,  code: 'COMMISSION', name: 'Commission', creatorFee: `${PLATFORM_FEE_PCT}%`, note: 'Deposit-based, same rate', tone: 'pink' },
]

const TONE_STYLES: Record<'purple' | 'teal' | 'amber' | 'pink', { fg: string; bg: string; border: string }> = {
  purple: { fg: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.30)' },
  teal:   { fg: '#0d9488', bg: 'rgba(13,148,136,0.10)', border: 'rgba(13,148,136,0.30)' },
  amber:  { fg: '#b45309', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)' },
  pink:   { fg: '#be185d', bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.30)' },
}

type ComparisonRow = {
  platform: string
  takes: string
  listingFee: string
  payouts: string
  highlight?: boolean
}

const COMPARISON_ROWS: ComparisonRow[] = [
  { platform: 'noizu.direct', takes: `${PLATFORM_FEE_PCT}% flat`, listingFee: 'None', payouts: 'Weekly', highlight: true },
  { platform: 'Etsy',         takes: '~10–12% effective',   listingFee: 'USD 0.20 / listing', payouts: 'Daily–weekly' },
  { platform: 'Gumroad',      takes: '10% flat',            listingFee: 'None',               payouts: 'Weekly' },
  { platform: 'BOOTH',        takes: '5.6% + ¥22',          listingFee: 'None',               payouts: 'Monthly' },
  { platform: 'Ko-fi',        takes: '0% (Gold: 5%)',       listingFee: 'None',               payouts: 'Daily (PayPal)' },
]

const PAYOUT_FACTS: { icon: LucideIcon; label: string; value: string; note: string }[] = [
  { icon: Wallet, label: 'Cadence', value: 'Weekly', note: 'Automatic, Mon–Fri' },
  { icon: CircleDollarSign, label: 'Minimum', value: 'RM 50', note: 'Below this rolls over' },
  { icon: ShieldCheck, label: 'Cooldown', value: '48h', note: 'After bank detail change' },
  { icon: Clock, label: 'Transfer time', value: '1–3 days', note: 'After payout issued' },
]

const REFUND_RULES: { label: string; value: string; explain: string }[] = [
  { label: 'Full refund',         value: 'Platform fee returned', explain: 'If the order is cancelled or refunded, we return our fee too.' },
  { label: 'Partial refund',      value: 'Platform fee prorated', explain: 'Fee scales with the refunded amount.' },
  { label: 'Processing fee',      value: 'Non-refundable',        explain: 'Card networks charge us regardless — this covers their cost.' },
  { label: 'Chargeback lost',     value: 'Amount + RM 80 fee',    explain: 'Recovery cost from the bank. Avoid with clear photos & tracking.' },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Why do buyers pay a separate processing fee?',
    a: 'Payment networks (Visa, Mastercard, FPX, ewallets) charge us ~2.5% on every transaction. Rather than bake it into your listing price and make you look more expensive, we show it as a line item at checkout. Every serious marketplace either does this or eats the cost — we chose transparency.',
  },
  {
    q: 'When does the 0% launch period end?',
    a: `Whichever comes first: ${LAUNCH_END_DATE}, or when we hit ${LAUNCH_CREATOR_CAP} active paying creators. We will email every creator at least 30 days before the platform fee activates, so you have time to review your prices.`,
  },
  {
    q: 'Are there volume discounts or pro tiers?',
    a: 'No. One flat rate for everyone. The creator selling their first sticker pays the same percentage as the studio shipping hundreds of orders a week. We think simplicity beats gamification.',
  },
  {
    q: 'What about taxes (SST, VAT, GST)?',
    a: 'Applicable tax is collected at checkout on the fees only, not the creator\'s payout. We remit the tax we collect. Creators are responsible for their own income tax in their home jurisdiction.',
  },
  {
    q: 'Do I pay fees on shipping costs?',
    a: 'No. Platform fee applies to the product subtotal only. Shipping flows through at cost — you keep the whole shipping charge minus the actual carrier rate.',
  },
  {
    q: 'Can I raise my prices by 5% to cover the platform fee?',
    a: 'Up to you. Most creators bake it in; some advertise "absorbing the fee" as a promo. We do not police listing prices.',
  },
]

/* ────────────────────────────────────────────────────────────────
 * Page
 * ───────────────────────────────────────────────────────────── */

export default function FeesPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative border-b border-border overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% -20%, rgba(124,58,237,0.10), transparent 60%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-14 pb-10 sm:pt-20 sm:pb-12">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-8">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="text-primary">Fees &amp; Payouts</span>
            <span className="w-8 h-px bg-border" aria-hidden="true" />
            <span>Transparent pricing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-foreground max-w-3xl leading-[1.1]">
            One number to remember. <span className="text-primary">{PLATFORM_FEE_PCT}%.</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-[1.65]">
            Flat {PLATFORM_FEE_PCT}% platform fee on sales. Buyers pay {PROCESSING_FEE_PCT}% processing at
            checkout. No listing fees, no subscriptions, no pro tiers. Everything you need
            to know fits on this page.
          </p>

          <ul className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-2" aria-label="Fees at a glance">
            {HERO_PILLS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium text-foreground"
              >
                <Icon size={14} className="text-primary" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          <div className="mt-10 pt-5 border-t border-border flex flex-wrap items-center gap-x-10 gap-y-3 text-sm">
            <Link
              href="/register/creator"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Apply to sell
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/creator-handbook"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Creator Handbook
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Full terms
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Launch banner ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(13,148,136,0.06) 100%)',
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-2xl border border-primary/30 bg-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(124,58,237,0.12)' }}
            >
              <Sparkle />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Launch offer
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Active
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                {LAUNCH_FEE_PCT}% platform fee until {LAUNCH_END_DATE}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                Free for the first <strong className="text-foreground">{LAUNCH_CREATOR_CAP} active creators</strong>{' '}
                or until {LAUNCH_END_DATE}, whichever comes first. You keep 100% of your listing price.
                Buyer-side processing fee still applies.
              </p>
            </div>
            <Link
              href="/register/creator"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary/90 min-h-[44px] flex-shrink-0"
            >
              Claim your spot
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Cheat sheet ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest text-primary mb-3"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <Tag size={12} aria-hidden="true" />
              At a glance
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              The numbers that matter
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CHEAT_SHEET.map(({ icon: Icon, label, value, hint }, i) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon
                    size={14}
                    style={{ color: i % 2 === 0 ? '#7c3aed' : '#0d9488' }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {label}
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-foreground leading-none mb-1.5">
                  {value}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Where RM100 goes ────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Money flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Where every RM 100 sale goes
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
              A buyer checks out at <strong className="text-foreground">RM 102.50</strong>.
              You list at RM 100. Here is the split.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <ol className="space-y-5">
              {FLOW_BARS.map(({ label, amount, note, pct, fg, bg }) => (
                <li key={label}>
                  <div className="flex items-baseline justify-between mb-2 gap-3">
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    <span className="font-mono text-sm font-bold tabular-nums" style={{ color: fg }}>
                      {amount}
                    </span>
                  </div>
                  <div className="w-full h-8 rounded-lg overflow-hidden bg-muted/60 relative">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg"
                      style={{
                        width: `${Math.max(pct, 3)}%`,
                        background: bg,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>
                </li>
              ))}
            </ol>

            <div className="mt-7 pt-5 border-t border-border grid grid-cols-3 text-center gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  Buyer pays
                </div>
                <div className="font-mono font-bold text-foreground tabular-nums">RM 102.50</div>
              </div>
              <div className="border-x border-border">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  You list at
                </div>
                <div className="font-mono font-bold text-foreground tabular-nums">RM 100.00</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  You receive
                </div>
                <div className="font-mono font-bold tabular-nums" style={{ color: '#0d9488' }}>
                  RM 95.00
                </div>
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs text-muted-foreground text-center">
            During launch you receive the full <span className="font-mono font-bold text-foreground">RM 100</span>.
            Buyer still pays the RM 2.50 processing fee.
          </p>
        </div>
      </section>

      {/* ── Product type fees ───────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              By product type
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Same rate, every format
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
              Digital, physical, POD, commission — one flat {PLATFORM_FEE_PCT}%. Shipping and
              print partner costs flow through at cost.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRODUCT_FEES.map(({ icon: Icon, code, name, creatorFee, note, tone }) => {
              const s = TONE_STYLES[tone]
              return (
                <div
                  key={code}
                  className="rounded-2xl border bg-card p-5 flex flex-col"
                  style={{ borderColor: s.border }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: s.bg }}
                    >
                      <Icon size={20} style={{ color: s.fg }} aria-hidden="true" />
                    </div>
                    <span
                      className="font-mono text-[10px] font-semibold tracking-wider px-2 py-1 rounded-full"
                      style={{ backgroundColor: s.bg, color: s.fg }}
                    >
                      {code}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">{name}</h3>
                  <div className="mt-3 text-3xl font-extrabold tabular-nums" style={{ color: s.fg }}>
                    {creatorFee}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    {note}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison ──────────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              How we compare
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Against the platforms you already know
            </h2>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-4 font-semibold text-foreground">Platform</th>
                    <th className="text-left px-5 py-4 font-semibold text-foreground">Takes</th>
                    <th className="text-left px-5 py-4 font-semibold text-foreground hidden sm:table-cell">Listing fee</th>
                    <th className="text-left px-5 py-4 font-semibold text-foreground hidden md:table-cell">Payouts</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr
                      key={row.platform}
                      className="border-b border-border last:border-0"
                      style={row.highlight ? { backgroundColor: 'rgba(124,58,237,0.06)' } : undefined}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${row.highlight ? 'text-primary' : 'text-foreground'}`}>
                            {row.platform}
                          </span>
                          {row.highlight && (
                            <span className="font-mono text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-primary border border-primary/30">
                              You are here
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-5 py-4 font-mono tabular-nums ${row.highlight ? 'text-primary font-bold' : 'text-foreground'}`}>
                        {row.takes}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">{row.listingFee}</td>
                      <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">{row.payouts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Competitor rates as published by each platform. Effective rates include processing,
            transaction, and listing fees where applicable.
          </p>
        </div>
      </section>

      {/* ── Payouts ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Payouts
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              How and when you get paid
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PAYOUT_FACTS.map(({ icon: Icon, label, value, note }, i) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: i % 2 === 0 ? 'rgba(124,58,237,0.10)' : 'rgba(13,148,136,0.10)',
                  }}
                >
                  <Icon
                    size={18}
                    style={{ color: i % 2 === 0 ? '#7c3aed' : '#0d9488' }}
                    aria-hidden="true"
                  />
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  {label}
                </div>
                <div className="text-xl font-extrabold text-foreground leading-none mb-1.5">
                  {value}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">{note}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground max-w-xl">
            Funds clear from escrow to your balance once the buyer protection window closes
            (7–21 days by product type). Payouts are issued automatically every Friday for balances
            above RM 50. You can also request an on-demand payout from the dashboard.
          </p>
        </div>
      </section>

      {/* ── Refunds ─────────────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Refunds &amp; reversals
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              What happens when money moves back
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REFUND_RULES.map(({ label, value, explain }) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                    >
                      <RefreshCw size={16} className="text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{label}</h3>
                  </div>
                  <span className="font-mono text-[10px] font-semibold tracking-wider px-2 py-1 rounded-full text-primary border border-primary/30 flex-shrink-0">
                    {value}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{explain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              The honest answers
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-border bg-card open:border-primary/40 transition-colors"
              >
                <summary className="cursor-pointer list-none p-5 sm:p-6 flex items-start gap-4">
                  <CheckCircle2
                    size={18}
                    className="text-primary mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-sm sm:text-base font-semibold text-foreground leading-snug">
                    {q}
                  </span>
                  <span
                    className="text-primary font-mono text-xs font-semibold flex-shrink-0 group-open:rotate-45 transition-transform"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 sm:px-6 pb-5 sm:pb-6 pl-[58px] sm:pl-[62px] text-sm text-muted-foreground leading-relaxed">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-2xl p-8 sm:p-10 text-white flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
          >
            <div className="max-w-xl">
              <div className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.2em] mb-2">
                Ready to list
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold leading-tight mb-2">
                Start selling with {LAUNCH_FEE_PCT}% platform fee.
              </h3>
              <p className="text-white/85 text-sm leading-relaxed">
                Keep 100% of your price through {LAUNCH_END_DATE}. Weekly payouts.
                Escrow-protected from day one.
              </p>
            </div>
            <Link
              href="/register/creator"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white font-semibold rounded-xl text-sm transition-all hover:bg-white/90 min-h-[44px] flex-shrink-0"
              style={{ color: '#7c3aed' }}
            >
              Apply to sell
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Fees shown are current as of the launch period and subject to change with 30 days notice.
            See <Link href="/terms" className="text-primary font-medium hover:underline underline-offset-4">Terms</Link>
            {' '}for the binding agreement.
          </p>
        </div>
      </section>
    </div>
  )
}

function Sparkle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"
        fill="#7c3aed"
      />
      <path d="M19 15l.9 2.4L22 18l-2.1.6L19 21l-.9-2.4L16 18l2.1-.6L19 15z" fill="#7c3aed" opacity="0.55" />
    </svg>
  )
}
