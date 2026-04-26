import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Check,
  X,
  UserPlus,
  ShieldCheck,
  Package,
  Rocket,
  Download,
  Printer,
  Palette,
  CircleDollarSign,
  Percent,
  Receipt,
  Wallet,
  Clock,
  Truck,
  Eye,
  TrendingUp,
  Pin,
  Sparkles,
  FileText,
  LifeBuoy,
  Gauge,
  Zap,
  Tag,
  type LucideIcon,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Creator Handbook',
  description:
    'A visual handbook for noizu.direct creators — onboarding, pricing, escrow, content policy, discovery, and playbooks.',
  alternates: { canonical: 'https://noizu.direct/creator-handbook' },
  openGraph: {
    title: 'Creator Handbook',
    description:
      'Everything a creator needs on noizu.direct — at a glance.',
    url: 'https://noizu.direct/creator-handbook',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'noizu.direct Creator Handbook' }],
  },
}

/* ────────────────────────────────────────────────────────────────
 * Data (all hardcoded — the handbook is a visual reference)
 * ───────────────────────────────────────────────────────────── */

const HERO_PILLS: { icon: LucideIcon; label: string }[] = [
  { icon: BookOpen, label: 'Visual reference' },
  { icon: Clock, label: '5 min read' },
  { icon: Sparkles, label: 'Updated weekly' },
]

const QUICK_START: { step: string; icon: LucideIcon; title: string; note: string }[] = [
  { step: '01', icon: UserPlus, title: 'Apply', note: '2 min form · links to your work' },
  { step: '02', icon: ShieldCheck, title: 'Verify', note: 'KYC · ID + selfie · 1–3 days' },
  { step: '03', icon: Package, title: 'List', note: 'Add products · set prices' },
  { step: '04', icon: Rocket, title: 'Sell', note: 'Escrow-protected · weekly payouts' },
]

const PRODUCT_TYPES: {
  icon: LucideIcon
  code: string
  name: string
  tag: string
  ships: string
  escrow: string
  tone: 'purple' | 'teal' | 'amber' | 'pink'
}[] = [
  {
    icon: Download,
    code: 'DIGITAL',
    name: 'Digital',
    tag: 'Files & downloads',
    ships: 'Signed URL',
    escrow: '7d or 1st download',
    tone: 'purple',
  },
  {
    icon: Package,
    code: 'PHYSICAL',
    name: 'Physical',
    tag: 'You ship it',
    ships: 'You dispatch',
    escrow: '48h after delivery',
    tone: 'teal',
  },
  {
    icon: Printer,
    code: 'POD',
    name: 'Print-on-demand',
    tag: 'We print, we ship',
    ships: 'Partner prints',
    escrow: '48h after delivery',
    tone: 'amber',
  },
  {
    icon: Palette,
    code: 'COMMISSION',
    name: 'Commission',
    tag: 'Bespoke work',
    ships: 'Digital + stages',
    escrow: '14d or acceptance',
    tone: 'pink',
  },
]

const TONE_STYLES: Record<'purple' | 'teal' | 'amber' | 'pink', { fg: string; bg: string; border: string }> = {
  purple: { fg: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.30)' },
  teal:   { fg: '#0d9488', bg: 'rgba(13,148,136,0.10)', border: 'rgba(13,148,136,0.30)' },
  amber:  { fg: '#b45309', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)' },
  pink:   { fg: '#be185d', bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.30)' },
}

const CHEAT_SHEET: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
}[] = [
  { icon: Percent, label: 'Platform fee', value: '0%', hint: 'During launch' },
  { icon: Receipt, label: 'Processing', value: '2.5%', hint: 'Every order' },
  { icon: Wallet, label: 'Payouts', value: 'Weekly', hint: 'Mon–Fri transfers' },
  { icon: ShieldCheck, label: 'Payout change', value: '48h', hint: 'Security cooldown' },
  { icon: Clock, label: 'Digital escrow', value: '7 days', hint: 'Or first download' },
  { icon: Truck, label: 'Physical escrow', value: '48h', hint: 'After delivery' },
  { icon: Palette, label: 'Commission escrow', value: '14 days', hint: 'Or accepted' },
  { icon: Eye, label: 'Dispute window', value: '30 days', hint: 'From purchase' },
]

const DO_LIST: string[] = [
  'Original work you authored',
  'Transformative fan art & doujin',
  'Your own cosplay photos & prints',
  'Clear listing photos & dimensions',
  'Honest shipping estimates',
  'Respond to DMs within 48h',
]

const DONT_LIST: string[] = [
  'Reselling another artist’s work',
  'Counterfeit or bootleg merch',
  'AI trained on a named artist',
  'Minors in sexual context',
  'Bait-and-switch listings',
  'Fake reviews or sockpuppets',
]

const DISCOVERY: {
  icon: LucideIcon
  name: string
  desc: string
  source: string
}[] = [
  { icon: TrendingUp, name: 'Trending score', desc: 'Views + sales + recency', source: 'Auto' },
  { icon: Gauge, name: 'Engagement', desc: 'Saves, shares, re-views', source: 'Auto' },
  { icon: Pin, name: 'Pinned listings', desc: 'Top of your store', source: 'You (x3 max)' },
  { icon: Sparkles, name: 'Featured', desc: 'Homepage rotation', source: 'Admin boost' },
]

const PLAYBOOKS: {
  tag: string
  title: string
  steps: string[]
  icon: LucideIcon
}[] = [
  {
    tag: 'Con drop',
    title: 'Launch a convention drop',
    icon: Zap,
    steps: ['Draft listings hidden', 'Schedule reveal', 'Cap stock per item', 'Pin 3 hero pieces'],
  },
  {
    tag: 'First order',
    title: 'Ship your first order',
    icon: Truck,
    steps: ['Print packing slip', 'Upload tracking', 'Mark dispatched', 'Escrow holds 48h'],
  },
  {
    tag: 'Commission',
    title: 'Open commission slots',
    icon: Palette,
    steps: ['Set # of slots', 'Define stages', 'Pin to profile', 'Close when full'],
  },
  {
    tag: 'Dispute',
    title: 'Resolve a dispute',
    icon: LifeBuoy,
    steps: ['Read buyer evidence', 'Upload yours <5 days', 'Propose resolution', 'Team decides'],
  },
]

const RESOURCES: {
  href: string
  title: string
  desc: string
  icon: LucideIcon
}[] = [
  { href: '/fees-payouts', title: 'Fees', desc: 'Current & future commission', icon: CircleDollarSign },
  { href: '/terms', title: 'Terms', desc: 'The binding legal agreement', icon: FileText },
  { href: '/help', title: 'Help Centre', desc: 'Answers & FAQs', icon: LifeBuoy },
  { href: '/dashboard', title: 'Dashboard', desc: 'Your orders & payouts', icon: Gauge },
]

/* ────────────────────────────────────────────────────────────────
 * Page
 * ───────────────────────────────────────────────────────────── */

export default function CreatorHandbookPage() {
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
            <span className="text-primary">Creator Handbook</span>
            <span className="w-8 h-px bg-border" aria-hidden="true" />
            <span>Everything at a glance</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-foreground max-w-3xl leading-[1.1]">
            The Creator Handbook
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-[1.65]">
            A visual reference for selling on noizu.direct. Pricing, payouts,
            escrow, policy, and playbooks — in as few words as possible.
          </p>

          <ul className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-2" aria-label="Handbook at a glance">
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
              href="/dashboard"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Open dashboard
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/fees-payouts"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Full fees page
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Quick start — 4 numbered steps ───────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Quick start
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
                Four steps from zero to first sale
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">Total: 1–3 days</span>
          </div>

          <ol className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_START.map(({ step, icon: Icon, title, note }, i) => (
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
                {i < QUICK_START.length - 1 && (
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

      {/* ── Product types — 4 color-coded cards ──────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Product types
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Four formats. Same escrow.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRODUCT_TYPES.map(({ icon: Icon, code, name, tag, ships, escrow, tone }) => {
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
                  <p className="text-xs text-muted-foreground mt-0.5 mb-4">{tag}</p>

                  <dl className="mt-auto space-y-2 text-xs border-t border-border pt-3">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Ships</dt>
                      <dd className="font-medium text-foreground text-right">{ships}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Escrow</dt>
                      <dd className="font-medium text-foreground text-right">{escrow}</dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Cheat sheet — 8-tile grid ────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest text-primary mb-3"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <Tag size={12} aria-hidden="true" />
              Cheat sheet
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              The numbers to memorise
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CHEAT_SHEET.map(({ icon: Icon, label, value, hint }, i) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-card p-4"
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
                <div className="text-xl font-extrabold text-foreground leading-none mb-1">
                  {value}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Do / Don't — two-column rules ────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Content policy
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              The short version
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
                >
                  <Check size={18} style={{ color: '#0d9488' }} aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Yes — do
                </h3>
              </div>
              <ul className="space-y-2.5">
                {DO_LIST.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground leading-snug">
                    <Check size={14} style={{ color: '#0d9488' }} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(220,38,38,0.10)' }}
                >
                  <X size={18} style={{ color: '#dc2626' }} aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  No — don&rsquo;t
                </h3>
              </div>
              <ul className="space-y-2.5">
                {DONT_LIST.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground leading-snug">
                    <X size={14} style={{ color: '#dc2626' }} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Full policy lives in the{' '}
            <Link href="/terms" className="text-primary font-medium hover:underline underline-offset-4">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Discovery ────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Discovery
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              How your work gets seen
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl">
              Four signals feed the homepage and &ldquo;For You&rdquo; feed.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DISCOVERY.map(({ icon: Icon, name, desc, source }, i) => (
              <div key={name} className="rounded-2xl border border-border bg-card p-5">
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
                <h3 className="text-sm font-bold text-foreground mb-1">{name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{desc}</p>
                <span
                  className="inline-block font-mono text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full text-muted-foreground border border-border"
                >
                  {source}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Playbooks ────────────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Playbooks
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Four common scenarios, four steps each
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLAYBOOKS.map(({ icon: Icon, tag, title, steps }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                  >
                    <Icon size={18} className="text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                      {tag}
                    </span>
                    <h3 className="text-sm font-bold text-foreground leading-tight">{title}</h3>
                  </div>
                </div>
                <ol className="space-y-2">
                  {steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-foreground leading-snug">
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground mt-0.5 min-w-[20px]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Resources + CTA ──────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Resources
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Where to go next
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {RESOURCES.map(({ href, title, desc, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-[0_4px_24px_rgba(124,58,237,0.08)]"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                >
                  <Icon size={18} className="text-primary" aria-hidden="true" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  <ArrowUpRight
                    size={14}
                    className="text-muted-foreground group-hover:text-primary transition-colors"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>

          <div
            className="rounded-2xl p-8 sm:p-10 text-white flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
          >
            <div className="max-w-xl">
              <div className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.2em] mb-2">
                Ready to sell
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold leading-tight mb-2">
                Start your creator account in ten minutes.
              </h3>
              <p className="text-white/85 text-sm leading-relaxed">
                0% platform fee during launch. Escrow-protected payments. Weekly payouts.
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
        </div>
      </section>
    </div>
  )
}
