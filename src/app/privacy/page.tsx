import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import sanitizeHtml from 'sanitize-html'
import {
  ArrowUpRight,
  Clock,
  Mail,
  ShieldCheck,
  MapPin,
  Trash2,
  Check,
  X,
  User,
  Activity,
  Share2,
  Eye,
  Edit3,
  Download,
  Ban,
  Flag,
  XCircle,
  ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | noizu.direct',
  description:
    'How noizu.direct collects, uses, and protects the personal information of buyers, creators, and visitors to the platform.',
  alternates: { canonical: 'https://noizu.direct/privacy' },
  robots: { index: true, follow: false },
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  // Same shape as /terms — needs `u` (TipTap Underline) and `style` (TipTap
  // TextAlign inline style) to survive the sanitizer. Restricted allowedStyles
  // keeps the XSS surface minimal.
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
        .replace(/&(mdash|ndash|amp|quot|apos|nbsp);/g, (m) => (m === '&amp;' ? '&' : ' '))
        .trim()
      const id = slugify(text) || `section-${sections.length + 1}`
      sections.push({ id, text })
      const existingAttrs = (attrs ?? '').replace(/\sid="[^"]*"/i, '')
      return `<h2 id="${id}"${existingAttrs}>${inner}</h2>`
    }
  )
  return { processed, sections }
}

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

// ── Hero trust pills ──────────────────────────────────────────────────
const TRUST_SIGNALS = [
  { icon: ShieldCheck, label: 'PDPA & GDPR-aligned' },
  { icon: MapPin, label: 'Data stays in region' },
  { icon: Trash2, label: 'Delete anytime' },
] as const

// ── What we do / what we never do ─────────────────────────────────────
const WHAT_WE_DO = [
  'Collect only what is needed to run the marketplace.',
  'Encrypt sensitive data at rest and all traffic in transit.',
  'Respond to verified privacy requests within 30 days.',
  'Delete your data on request, subject to legal retention rules.',
] as const

const WHAT_WE_NEVER_DO = [
  'Sell, rent, or trade your personal information.',
  'Train machine-learning models on your messages or files.',
  'Share your identity documents with buyers or Sellers.',
  'Use dark patterns or force consent as a precondition.',
] as const

// ── Information we collect ────────────────────────────────────────────
const INFO_CATEGORIES = [
  {
    icon: User,
    label: 'What you provide',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.10)',
    items: [
      'Name, email, country, hashed password',
      'Profile bio, avatar, and banner',
      'Shipping address and courier phone',
      'Seller KYC: ID + liveness selfie',
      'Support and dispute messages',
    ],
  },
  {
    icon: Activity,
    label: 'Collected automatically',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.10)',
    items: [
      'IP address and approximate location',
      'Browser, device, and OS signals',
      'Pages visited, products viewed',
      'Sign-in and security telemetry',
    ],
  },
  {
    icon: Share2,
    label: 'From third parties',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.10)',
    items: [
      'Tokenised payment references (Airwallex)',
      'Authorised profile fields from SSO providers',
      'Shipment tracking from couriers',
    ],
  },
] as const

// ── How long we keep it ───────────────────────────────────────────────
const RETENTION_PERIODS = [
  { duration: '36', unit: 'months', label: 'Account records after closure', featured: false },
  { duration: '7', unit: 'years', label: 'Transaction records', featured: true },
  { duration: '7', unit: 'years', label: 'KYC documents after last payout', featured: false },
  { duration: '24', unit: 'months', label: 'Security and fraud logs', featured: false },
  { duration: '12', unit: 'months', label: 'Marketing consent records', featured: false },
  { duration: '3', unit: 'years', label: 'Support and dispute correspondence', featured: false },
] as const

// ── Your rights ───────────────────────────────────────────────────────
const RIGHTS = [
  { icon: Eye,     name: 'Access',            desc: 'Get a copy of the personal information we hold about you.' },
  { icon: Edit3,   name: 'Rectification',     desc: 'Ask us to correct inaccurate or incomplete information.' },
  { icon: Trash2,  name: 'Erasure',           desc: 'Request deletion, subject to legal retention rules.' },
  { icon: Download,name: 'Portability',       desc: 'Receive a structured, machine-readable export of your data.' },
  { icon: Ban,     name: 'Objection',         desc: 'Object to processing based on our legitimate interests.' },
  { icon: XCircle, name: 'Withdraw consent',  desc: 'Withdraw any consent you have given, at any time.' },
  { icon: Flag,    name: 'Complaint',         desc: 'Lodge a complaint with the Malaysia PDPC or your local DPA.' },
] as const

export default async function PrivacyPage() {
  const page = await prisma.page.findUnique({ where: { slug: 'privacy' } })

  const title = page?.title ?? 'Privacy Policy'
  const rawContent = page?.content
  const safeContent = rawContent ? sanitizeHtml(rawContent, SANITIZE_OPTIONS) : null
  const { processed, sections } = safeContent
    ? extractSectionsAndAnchor(safeContent)
    : { processed: null as string | null, sections: [] as { id: string; text: string }[] }

  const updatedAt = page?.updatedAt ?? new Date('2026-04-22')
  const updatedStr = formatUpdated(updatedAt)
  const readingMinutes = estimateReadingMinutes(rawContent)

  // Shared editorial typography — see terms/page.tsx for the full explanation.
  // Tailwind 4 without @tailwindcss/typography; all rhythm is built from core
  // `[&_el]:…` arbitrary selectors and mirrors TipTapEditor.tsx for WYSIWYG.
  const proseClasses = [
    'max-w-none text-foreground font-sans',
    '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-foreground',
    '[&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:leading-[1.2]',
    '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground',
    '[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:scroll-mt-28 [&_h2]:leading-[1.3]',
    '[&_h2:first-of-type]:mt-6',
    '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-7 [&_h3]:mb-2',
    '[&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-6 [&_h4]:mb-2',
    '[&_p]:text-foreground [&_p]:leading-[1.7] [&_p]:my-4 [&_p]:text-[16px]',
    '[&_strong]:text-foreground [&_strong]:font-semibold',
    '[&_em]:text-muted-foreground [&_em]:italic',
    '[&_u]:underline [&_u]:underline-offset-2',
    '[&_a]:text-primary [&_a]:font-medium [&_a]:underline [&_a]:decoration-primary/30 hover:[&_a]:decoration-primary [&_a]:underline-offset-[3px]',
    '[&_ul]:my-4 [&_ol]:my-4 [&_ul]:pl-5 [&_ol]:pl-5',
    '[&_ul]:list-disc [&_ol]:list-decimal',
    '[&_li]:text-foreground [&_li]:my-1.5 [&_li]:leading-[1.7] [&_li]:text-[16px]',
    '[&_li]:marker:text-muted-foreground',
    '[&_blockquote]:not-italic [&_blockquote]:font-normal',
    '[&_blockquote]:border-0 [&_blockquote]:border-l-[3px] [&_blockquote]:border-l-primary',
    '[&_blockquote]:bg-muted/50 [&_blockquote]:px-6 [&_blockquote]:py-5',
    '[&_blockquote]:rounded-r-lg',
    '[&_blockquote]:my-8 [&_blockquote]:text-foreground',
    '[&_blockquote]:text-[15px] [&_blockquote]:leading-[1.7]',
    '[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[14px]',
    '[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-5 [&_pre]:overflow-x-auto',
    '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
    '[&_hr]:border-border [&_hr]:my-10',
    '[&_img]:rounded-lg [&_img]:my-6 [&_img]:max-w-full [&_img]:h-auto',
  ].join(' ')

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
            <span className="text-primary">Privacy</span>
            <span className="w-8 h-px bg-border" aria-hidden="true" />
            <span>Data Protection</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-foreground max-w-3xl leading-[1.1]">
            {title}
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-[1.65]">
            How we collect, use, and protect personal information belonging to
            the buyers, creators, and visitors who use noizu.direct. Written
            plainly, and in line with Malaysia&rsquo;s PDPA and the EU GDPR.
          </p>

          <ul className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-2" aria-label="Privacy principles">
            {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
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
              href="/terms"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Terms of Service
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Our promises: do / never do ─────────────────────────── */}
      <section className="bg-muted/40 border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 text-primary"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <ShieldCheck size={12} aria-hidden="true" />
              Our promises
            </span>
            <h2 id="our-promises" className="text-2xl sm:text-3xl font-extrabold text-foreground scroll-mt-28">
              What we do — and what we never do
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Do card */}
            <div className="rounded-2xl border border-border bg-card p-7">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
                >
                  <Check size={22} style={{ color: '#0d9488' }} aria-hidden="true" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#0d9488' }}>
                    What we do
                  </div>
                  <h3 className="text-lg font-bold text-foreground">By design, every day</h3>
                </div>
              </div>
              <ul className="space-y-3">
                {WHAT_WE_DO.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
                    <Check size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#0d9488' }} aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Never-do card */}
            <div className="rounded-2xl border border-border bg-card p-7">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                >
                  <X size={22} className="text-primary" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                    What we never do
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No loopholes, no exceptions</h3>
                </div>
              </div>
              <ul className="space-y-3">
                {WHAT_WE_NEVER_DO.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
                    <X size={16} className="mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Information we collect ──────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Data categories
            </span>
            <h2 id="information-we-collect" className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2 scroll-mt-28">
              Information we collect
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Only what is needed to run the marketplace, ship your orders, and meet our legal obligations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {INFO_CATEGORIES.map(({ icon: Icon, label, color, bg, items }) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: bg }}
                >
                  <Icon size={22} style={{ color }} aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-3">{label}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                  {items.map((it) => (
                    <li key={it} className="flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-[0.5rem] w-1 h-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Narrative policy body (CMS-editable via TipTap) ─────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Full policy
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              The detail
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,680px)] gap-10 lg:gap-16 lg:justify-center">

            {/* Desktop sidebar TOC — only CMS sections (hardcoded sections are
                already visible as full-width blocks around this one) */}
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
                            className="group flex items-start gap-2 py-1.5 px-3 -mx-3 rounded-lg hover:bg-muted/80 transition-colors"
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
                      <strong>Summary.</strong> We collect only what we need to
                      run the marketplace, keep it safe, and let you export or
                      delete it on request. The full Privacy Policy has not yet
                      been published.
                    </p>
                  </blockquote>
                  <p>
                    For specific questions, please contact{' '}
                    <a href="mailto:privacy@noizu.direct">privacy@noizu.direct</a>.
                  </p>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>

      {/* ── How long we keep it ─────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 text-primary"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <Clock size={12} aria-hidden="true" />
              Retention
            </span>
            <h2 id="how-long-we-keep-it" className="text-2xl sm:text-3xl font-extrabold text-foreground scroll-mt-28">
              How long we keep it
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              At the end of each period, data is either deleted or irreversibly de-identified.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {RETENTION_PERIODS.map(({ duration, unit, label, featured }) => (
              <div
                key={label}
                className="rounded-2xl border bg-card p-6 flex flex-col"
                style={{
                  borderColor: featured ? 'rgba(124,58,237,0.35)' : undefined,
                  borderWidth: featured ? '2px' : undefined,
                }}
              >
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span
                    className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none"
                    style={{ color: featured ? '#7c3aed' : 'var(--color-foreground)' }}
                  >
                    {duration}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {unit}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Your rights ─────────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Your rights
            </span>
            <h2 id="your-rights" className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2 scroll-mt-28">
              You stay in control
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Exercise any of these rights at any time. We aim to respond to verified requests within 30 days.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RIGHTS.map(({ icon: Icon, name, desc }) => (
              <div key={name} className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                >
                  <Icon size={18} className="text-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground mb-1">{name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* How to exercise — gradient CTA banner, matches how-it-works style */}
          <div
            className="mt-8 rounded-2xl p-7 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.2em] mb-2">
                How to exercise a right
              </div>
              <p className="text-white/90 text-sm sm:text-base leading-relaxed">
                Most actions &mdash; export, deletion, marketing opt-out &mdash; live inside your account settings.
                For anything else, email <strong className="text-white">privacy@noizu.direct</strong>. We may ask
                you to verify your identity first, to protect your information from unauthorised disclosure.
              </p>
            </div>
            <a
              href="mailto:privacy@noizu.direct"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white font-semibold rounded-xl text-sm transition-all hover:bg-white/90 min-h-[44px] flex-shrink-0"
              style={{ color: '#7c3aed' }}
            >
              Contact privacy team
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Contact / data requests ─────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-6 sm:gap-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(124,58,237,0.08)' }}
            >
              <Mail size={20} className="text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-3">
                Data requests and enquiries
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                Requests to access, correct, export, or delete personal
                information may be directed to the addresses below. We aim to
                respond to all verified requests within thirty (30) days.
              </p>
              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    Privacy requests
                  </dt>
                  <dd>
                    <a
                      href="mailto:privacy@noizu.direct"
                      className="text-primary font-medium hover:underline underline-offset-4 break-all"
                    >
                      privacy@noizu.direct
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    Data Protection Officer
                  </dt>
                  <dd>
                    <a
                      href="mailto:dpo@noizu.direct"
                      className="text-primary font-medium hover:underline underline-offset-4 break-all"
                    >
                      dpo@noizu.direct
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    Legal &amp; compliance
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
              </dl>
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
        </div>
      </section>

    </div>
  )
}
