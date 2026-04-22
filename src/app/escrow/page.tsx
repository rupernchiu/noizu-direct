import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Lock,
  Unlock,
  CreditCard,
  Download,
  Package,
  Printer,
  Palette,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Scale,
  FileSearch,
  Handshake,
  Gavel,
  AlertTriangle,
  RefreshCw,
  Tag,
  Eye,
  Megaphone,
  type LucideIcon,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'How Escrow Works | Buyer & Seller Protection | noizu.direct',
  description:
    'Your payment is held safely until both sides confirm the transaction. Fraud protection for buyers, chargeback protection for creators. Published release windows by product type.',
  alternates: { canonical: 'https://noizu.direct/escrow' },
  openGraph: {
    title: 'How Escrow Works | noizu.direct',
    description:
      'Escrow-protected payments. Buyer fraud guarantee. Seller chargeback protection. Clear release windows.',
    url: 'https://noizu.direct/escrow',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'noizu.direct Escrow & Protection' }],
  },
}

/* ────────────────────────────────────────────────────────────────
 * Data — all placeholder copy until policy is finalised.
 * ───────────────────────────────────────────────────────────── */

const HERO_PILLS: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck, label: 'Every order protected' },
  { icon: Lock, label: 'Funds held, not forwarded' },
  { icon: Scale, label: 'Neutral dispute review' },
]

const TIMELINE: { step: string; icon: LucideIcon; title: string; note: string }[] = [
  { step: '01', icon: CreditCard, title: 'Buy', note: 'Buyer pays. Card is charged.' },
  { step: '02', icon: Lock, title: 'Hold', note: 'Funds sit in escrow, not in the creator’s balance.' },
  { step: '03', icon: Eye, title: 'Confirm', note: 'Delivery triggers the release window.' },
  { step: '04', icon: Unlock, title: 'Release', note: 'Window closes. Funds land in creator payout queue.' },
]

const PRODUCT_WINDOWS: {
  icon: LucideIcon
  code: string
  name: string
  window: string
  trigger: string
  tone: 'purple' | 'teal' | 'amber' | 'pink'
}[] = [
  {
    icon: Download,
    code: 'DIGITAL',
    name: 'Digital files',
    window: '7 days',
    trigger: 'From first download (or 7 days after purchase, whichever first)',
    tone: 'purple',
  },
  {
    icon: Package,
    code: 'PHYSICAL',
    name: 'Physical goods',
    window: '48 hours',
    trigger: 'After courier marks delivered',
    tone: 'teal',
  },
  {
    icon: Printer,
    code: 'POD',
    name: 'Print-on-demand',
    window: '21 days',
    trigger: 'Covers production + ship + delivery confirmation',
    tone: 'amber',
  },
  {
    icon: Palette,
    code: 'COMMISSION',
    name: 'Commissions',
    window: '14 days',
    trigger: 'Per milestone acceptance (or 14 days after final delivery)',
    tone: 'pink',
  },
]

const TONE_STYLES: Record<'purple' | 'teal' | 'amber' | 'pink', { fg: string; bg: string; border: string }> = {
  purple: { fg: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.30)' },
  teal:   { fg: '#0d9488', bg: 'rgba(13,148,136,0.10)', border: 'rgba(13,148,136,0.30)' },
  amber:  { fg: '#b45309', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)' },
  pink:   { fg: '#be185d', bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.30)' },
}

const BUYER_GUARANTEES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Truck,
    title: 'Never arrived',
    desc: 'Tracking shows no delivery past the window. Full refund from escrow, not the creator.',
  },
  {
    icon: AlertTriangle,
    title: 'Arrived damaged',
    desc: 'Broken, crushed, or water-damaged. Submit unboxing photos within 48h for refund or replacement.',
  },
  {
    icon: FileSearch,
    title: 'Not as described',
    desc: 'Wrong item, wrong size, missing pieces, significantly different from listing photos.',
  },
  {
    icon: Lock,
    title: 'Unauthorized charge',
    desc: 'Card used without your consent. Report within 7 days — we freeze the transaction instantly.',
  },
  {
    icon: XCircle,
    title: 'Counterfeit item',
    desc: 'Listed as a named-brand product but isn’t. Full refund plus account review of the creator.',
  },
  {
    icon: Megaphone,
    title: 'Creator went silent',
    desc: 'No response for 7 days on a pending physical order. Auto-refunded from escrow.',
  },
]

const SELLER_GUARANTEES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: ShieldCheck,
    title: 'Chargeback shielded',
    desc: 'With tracking + delivery confirmation, we contest bank chargebacks on your behalf and bear the fee on wins.',
  },
  {
    icon: Clock,
    title: '5-day response window',
    desc: 'You get 5 days to submit evidence on any dispute. Silence from buyer after that closes the case in your favour.',
  },
  {
    icon: Gavel,
    title: 'Neutral review',
    desc: 'A human on the platform team makes the call — not an algorithm, not the buyer’s word alone.',
  },
  {
    icon: Handshake,
    title: 'No buyer’s remorse',
    desc: '“Changed my mind” is not a covered reason. Escrow releases if the item matches the listing.',
  },
]

const DISPUTE_FLOW: { step: string; title: string; detail: string; role: 'Buyer' | 'Creator' | 'Platform' }[] = [
  { step: '01', title: 'Raise a dispute', detail: 'Buyer opens a claim from the order page within the protection window.', role: 'Buyer' },
  { step: '02', title: 'Submit evidence', detail: 'Buyer uploads photos, tracking, or messages. Creator has 5 days to respond.', role: 'Creator' },
  { step: '03', title: 'Platform reviews', detail: 'Human reviewer reads both sides. May ask clarifying questions.', role: 'Platform' },
  { step: '04', title: 'Decision', detail: 'Full refund, partial refund, replacement, or release to creator — whichever matches the evidence.', role: 'Platform' },
  { step: '05', title: 'Execution', detail: 'Automatic. Refund hits the original card within 3–10 days. Release hits the payout queue.', role: 'Platform' },
]

const NOT_COVERED: string[] = [
  'Buyer’s remorse or sizing mistakes you could have checked',
  'Minor colour variance within normal print tolerance',
  'Expected wear on fabric, paper, or sculpt over time',
  'Loss after delivery confirmation (porch theft — file with courier)',
  'Claims raised after the protection window closes',
  'Chargebacks filed without contacting the creator first',
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Who holds the money during escrow?',
    a: 'A regulated payment processor (Airwallex) holds the funds in a segregated merchant account. noizu.direct does not custody the money — we only instruct release or refund based on the evidence. This means even if the platform went offline, the funds would still be recoverable.',
  },
  {
    q: 'Can a buyer chargeback after confirming delivery?',
    a: 'Buyers have 60–180 days at the card-network level to file a chargeback regardless of platform rules — that’s the bank’s decision, not ours. However, with valid tracking, proof of delivery, and matching item photos, noizu.direct defends the creator and absorbs the contest fee on wins. Cases without tracking are much harder to defend.',
  },
  {
    q: 'What if the creator disappears mid-commission?',
    a: 'Commissions release per milestone. If a creator goes unresponsive for 14 days on an accepted milestone, the buyer can escalate and we refund the undelivered portion from the remaining escrow balance. Delivered milestones stay paid.',
  },
  {
    q: 'Are digital downloads really protected?',
    a: 'Yes — within scope. Non-delivery (file didn’t download) and file-significantly-differs-from-listing (wrong file, corrupted, empty) are covered for 7 days. Change-of-mind after downloading a working file is not covered, for obvious reasons.',
  },
  {
    q: 'What counts as valid evidence?',
    a: 'For buyers: unboxing video, dated photos, screenshots of listing vs received item, tracking. For creators: tracking with delivery confirmation, photos taken before dispatch, messages acknowledging receipt, dated studio photos for commissions.',
  },
  {
    q: 'Does escrow cover shipping fees?',
    a: 'Yes. If an order qualifies for a full refund, the buyer’s shipping charge is refunded too. If a buyer returns an item by choice (not due to fault), return shipping is their responsibility.',
  },
]

/* ────────────────────────────────────────────────────────────────
 * Page
 * ───────────────────────────────────────────────────────────── */

export default function EscrowPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative border-b border-border overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% -20%, rgba(13,148,136,0.10), transparent 60%)',
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
            <span className="text-primary">Escrow &amp; protection</span>
            <span className="w-8 h-px bg-border" aria-hidden="true" />
            <span>Trust &amp; safety</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-foreground max-w-3xl leading-[1.1]">
            Your money, <span className="text-primary">held safely</span>.
            Until both sides are happy.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-[1.65]">
            Every order on noizu.direct is escrow-protected. Funds sit with a
            regulated processor — not the creator, not the platform — until
            delivery is confirmed. If something goes wrong, we step in.
          </p>

          <ul className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-2" aria-label="Escrow at a glance">
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
              href="/marketplace"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Browse marketplace
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/fees-payouts"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Fees &amp; payouts
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Raise a dispute
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Timeline — 4-step flow ──────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                How it works
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
                Four stages. One promise.
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">Every order, every time</span>
          </div>

          <ol className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TIMELINE.map(({ step, icon: Icon, title, note }, i) => (
              <li key={step} className="relative">
                <div className="rounded-2xl border border-border bg-card p-5 h-full">
                  <div className="flex items-start justify-between mb-5">
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
                    <span className="font-mono text-xs font-semibold text-muted-foreground tracking-wider">
                      {step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{note}</p>
                </div>
                {i < TIMELINE.length - 1 && (
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 text-border"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Product-type windows ─────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Release windows
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              How long the funds stay in escrow
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
              Each product type has a different window, calibrated to the real-world
              delivery risk.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRODUCT_WINDOWS.map(({ icon: Icon, code, name, window: win, trigger, tone }) => {
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
                    {win}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    {trigger}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Buyer guarantees ─────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest text-primary mb-3"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <Tag size={12} aria-hidden="true" />
              Buyer guarantees
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              If you pay, you get what you paid for
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
              Six scenarios covered by escrow. Refund issued by the platform from
              the held funds — you don’t chase the creator.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUYER_GUARANTEES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
                  >
                    <Icon size={18} style={{ color: '#0d9488' }} aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground leading-tight">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Seller guarantees ────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest text-primary mb-3"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <ShieldCheck size={12} aria-hidden="true" />
              Creator protection
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              If you deliver, you get paid
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
              Escrow works both ways. Dishonest buyers cost creators real money on
              other platforms — here, evidence wins.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SELLER_GUARANTEES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                  >
                    <Icon size={18} className="text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground leading-tight">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dispute flow ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Dispute flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              What happens when something goes wrong
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
              Disputes rarely happen — under 1% of orders. When they do, this is the path.
            </p>
          </div>

          <ol className="space-y-3">
            {DISPUTE_FLOW.map(({ step, title, detail, role }) => (
              <li
                key={step}
                className="rounded-2xl border border-border bg-card p-5 flex items-start gap-5"
              >
                <span
                  className="font-mono text-2xl font-extrabold text-primary tabular-nums flex-shrink-0 w-10 text-center"
                  aria-hidden="true"
                >
                  {step}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight">
                      {title}
                    </h3>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-muted-foreground border border-border">
                      {role}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Not covered ─────────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Edge cases
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              What escrow does <span className="text-muted-foreground">not</span> cover
            </h2>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {NOT_COVERED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground leading-snug">
                  <XCircle
                    size={16}
                    style={{ color: '#dc2626' }}
                    className="mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            For scenarios outside escrow, the creator may still offer a voluntary
            refund or exchange. Talk to them first through the order messages.
          </p>
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
              The fine print, in plain English
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

      {/* ── Dual CTA ────────────────────────────────────────────── */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div
            className="rounded-2xl p-7 sm:p-8 text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
          >
            <div className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.2em] mb-2">
              Buyers
            </div>
            <h3 className="text-xl font-extrabold leading-tight mb-2">
              Shop with confidence.
            </h3>
            <p className="text-white/85 text-sm leading-relaxed mb-5">
              Every order is escrow-protected. Independent SEA creators, safer
              than paying by DM.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white font-semibold rounded-xl text-sm transition-all hover:bg-white/90 min-h-[44px]"
              style={{ color: '#7c3aed' }}
            >
              Browse marketplace
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div
            className="rounded-2xl p-7 sm:p-8 text-white"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #065f46 100%)' }}
          >
            <div className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.2em] mb-2">
              Creators
            </div>
            <h3 className="text-xl font-extrabold leading-tight mb-2">
              Sell without fear of chargebacks.
            </h3>
            <p className="text-white/85 text-sm leading-relaxed mb-5">
              Deliver, document, get paid. We defend valid orders against
              bad-faith claims.
            </p>
            <Link
              href="/register/creator"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white font-semibold rounded-xl text-sm transition-all hover:bg-white/90 min-h-[44px]"
              style={{ color: '#0d9488' }}
            >
              Start selling
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <p className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-8 text-xs text-muted-foreground text-center">
          Full rules and binding terms are in the{' '}
          <Link href="/terms" className="text-primary font-medium hover:underline underline-offset-4">
            Terms of Service
          </Link>
          . Escrow policy may be updated with 30 days notice.
        </p>
      </section>
    </div>
  )
}
