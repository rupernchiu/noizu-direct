import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import sanitizeHtml from 'sanitize-html'
import {
  ArrowUpRight,
  Mail,
  Database,
  HardDrive,
  Cloud,
  MapPin,
  Lock,
  Shield,
  Clock,
  Archive,
  Trash2,
  RefreshCw,
  FileCheck2,
  Server,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Storage Policy | noizu.direct',
  description:
    'Where noizu.direct stores data and creator files, how long we keep it, how we encrypt and back it up, and how you can request export or deletion. Malaysia primary, EEA replicas.',
  alternates: { canonical: 'https://noizu.direct/storage-policy' },
  openGraph: {
    title: 'Storage Policy | noizu.direct',
    description:
      'Data and file storage practices for the noizu.direct marketplace — regions, encryption, retention, recovery, deletion.',
    url: 'https://noizu.direct/storage-policy',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'noizu.direct Storage Policy' }],
  },
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
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

const HERO_PILLS = [
  { icon: MapPin, label: 'Primary region: Malaysia' },
  { icon: Shield, label: 'Encrypted in transit & at rest' },
  { icon: Archive, label: 'Daily backups, EEA replicas' },
] as const

const WHERE_DATA_LIVES = [
  {
    icon: Database,
    title: 'Relational database',
    body: 'Orders, accounts, listings, and financial records live in a managed Postgres cluster hosted in Malaysia, with point-in-time recovery enabled.',
  },
  {
    icon: HardDrive,
    title: 'Object storage',
    body: 'Creator-uploaded files — product images, digital downloads, commission deliverables — are stored in encrypted object buckets with per-object access control.',
  },
  {
    icon: Cloud,
    title: 'Disaster-recovery replicas',
    body: 'Encrypted replicas of the database and a subset of object storage sit in the European Economic Area, used only for disaster recovery and never served to users.',
  },
  {
    icon: Server,
    title: 'Isolated KYC vault',
    body: 'Identity documents (IDs, selfies) are stored in a separate, access-restricted bucket with stricter retention rules than the rest of the platform.',
  },
] as const

type RetentionTier = {
  icon: typeof FileCheck2
  label: string
  duration: string
  detail: string
  tone?: 'accent'
}

const RETENTION_TIERS: readonly RetentionTier[] = [
  {
    icon: FileCheck2,
    label: 'Active records',
    duration: 'Indefinite',
    detail: 'Live account, listings, and order data while your account is open.',
  },
  {
    icon: Clock,
    label: 'Financial records',
    duration: '7 years',
    detail: 'Invoices, payouts, and tax records, as required by Malaysian accounting law.',
  },
  {
    icon: Archive,
    label: 'Support correspondence',
    duration: '36 months',
    detail: 'Email threads, ticket logs, and dispute evidence — kept to investigate recurring issues.',
  },
  {
    icon: RefreshCw,
    label: 'Daily backups',
    duration: '30 days',
    detail: 'Encrypted backup snapshots, overwritten on a rolling basis.',
    tone: 'accent',
  },
  {
    icon: Lock,
    label: 'KYC documents',
    duration: '18 months after closure',
    detail: 'Identity documents retained to defend against later chargebacks and fraud investigations.',
    tone: 'accent',
  },
  {
    icon: Trash2,
    label: 'Deleted content',
    duration: '30 days',
    detail: 'Soft-deleted listings and unpublished digital files, then fully purged.',
    tone: 'accent',
  },
]

export default async function StoragePolicyPage() {
  const page = await prisma.page.findUnique({ where: { slug: 'storage-policy' } })

  const title = page?.title ?? 'Storage Policy'
  const rawContent = page?.content
  const safeContent = rawContent ? sanitizeHtml(rawContent, SANITIZE_OPTIONS) : null
  const { processed, sections } = safeContent
    ? extractSectionsAndAnchor(safeContent)
    : { processed: null as string | null, sections: [] as { id: string; text: string }[] }

  const proseClasses = [
    'max-w-none text-foreground font-sans',
    '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-10 [&_h1]:mb-4',
    '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:scroll-mt-28 [&_h2]:leading-[1.3]',
    '[&_h2:first-of-type]:mt-6',
    '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-7 [&_h3]:mb-2',
    '[&_p]:text-foreground [&_p]:leading-[1.7] [&_p]:my-4 [&_p]:text-[16px]',
    '[&_strong]:text-foreground [&_strong]:font-semibold',
    '[&_em]:text-muted-foreground [&_em]:italic',
    '[&_u]:underline [&_u]:underline-offset-2',
    '[&_a]:text-primary [&_a]:font-medium [&_a]:underline [&_a]:decoration-primary/30 hover:[&_a]:decoration-primary [&_a]:underline-offset-[3px]',
    '[&_ul]:my-4 [&_ol]:my-4 [&_ul]:pl-5 [&_ol]:pl-5',
    '[&_ul]:list-disc [&_ol]:list-decimal',
    '[&_li]:text-foreground [&_li]:my-1.5 [&_li]:leading-[1.7] [&_li]:text-[16px]',
    '[&_li]:marker:text-muted-foreground',
    '[&_blockquote]:not-italic [&_blockquote]:font-normal [&_blockquote]:border-0 [&_blockquote]:border-l-[3px] [&_blockquote]:border-l-primary',
    '[&_blockquote]:bg-muted/50 [&_blockquote]:px-6 [&_blockquote]:py-5 [&_blockquote]:rounded-r-lg',
    '[&_blockquote]:my-8 [&_blockquote]:text-foreground [&_blockquote]:text-[15px] [&_blockquote]:leading-[1.7]',
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
            <span className="text-primary">Storage Policy</span>
            <span className="w-8 h-px bg-border" aria-hidden="true" />
            <span>Data & files</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-foreground max-w-3xl leading-[1.1]">
            {title}
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-[1.65]">
            Where your data and creator files live, how we protect them, how
            long we keep them, and how you can export or delete them. Written
            as a companion to our <Link href="/privacy" className="text-primary font-medium hover:underline underline-offset-4">Privacy Policy</Link>.
          </p>

          <ul className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-2" aria-label="Storage at a glance">
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
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <span className="font-semibold text-foreground">Effective</span>
              <span>22 April 2026</span>
            </div>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Read Privacy Policy
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Read Terms of Service
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Where data lives ─────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 text-primary"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <Database size={12} aria-hidden="true" />
              Where data lives
            </span>
            <h2 id="where-data-lives" className="text-2xl sm:text-3xl font-extrabold text-foreground scroll-mt-28">
              Four systems, four purposes
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Each system is tuned for what it stores and who is allowed to read it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {WHERE_DATA_LIVES.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-7">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: i % 2 === 0 ? 'rgba(124,58,237,0.10)' : 'rgba(13,148,136,0.10)',
                    }}
                  >
                    <Icon
                      size={22}
                      style={{ color: i % 2 === 0 ? '#7c3aed' : '#0d9488' }}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Retention tiers ──────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Retention
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              How long we keep each thing
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Durations follow applicable law and realistic dispute timelines — no data kept &ldquo;just in case&rdquo;.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RETENTION_TIERS.map(({ icon: Icon, label, duration, detail, tone }) => (
              <div
                key={label}
                className="rounded-2xl border bg-card p-6"
                style={{
                  borderColor:
                    tone === 'accent' ? 'rgba(13,148,136,0.35)' : 'rgba(124,58,237,0.35)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    backgroundColor:
                      tone === 'accent' ? 'rgba(13,148,136,0.10)' : 'rgba(124,58,237,0.10)',
                  }}
                >
                  <Icon
                    size={18}
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
                <p className="text-xl font-extrabold text-foreground mb-2 leading-none">
                  {duration}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CMS narrative with TOC ───────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              The detail
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              How storage actually works
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,680px)] gap-10 lg:gap-16 lg:justify-center">

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

            {sections.length > 0 && (
              <details className="lg:hidden rounded-xl border border-border bg-card overflow-hidden group">
                <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none list-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-foreground">
                    Contents
                  </span>
                  <span className="text-xs text-muted-foreground group-open:hidden">
                    {sections.length} sections
                  </span>
                  <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">
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
                        <span className="font-medium min-w-[18px]">{idx + 1}.</span>
                        <span>{s.text}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <article className="min-w-0">
              {processed ? (
                <div className={proseClasses} dangerouslySetInnerHTML={{ __html: processed }} />
              ) : (
                <div className={proseClasses}>
                  <blockquote>
                    <p>
                      <strong>Storage detail.</strong> The detailed policy is
                      being published here shortly. In the meantime, reach us
                      at <a href="mailto:privacy@noizu.direct">privacy@noizu.direct</a>.
                    </p>
                  </blockquote>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>

      {/* ── Contact block ──────────────────────────────────────── */}
      <section className="bg-muted/40 border-t border-border py-16 sm:py-20">
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
                Data requests & questions
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                Request a data export, ask about a specific record, or escalate a
                retention concern. We respond to all data-subject requests within thirty days.
              </p>
              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    Privacy & exports
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
                    Security reports
                  </dt>
                  <dd>
                    <a
                      href="mailto:security@noizu.direct"
                      className="text-primary font-medium hover:underline underline-offset-4 break-all"
                    >
                      security@noizu.direct
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    DPO
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
              </dl>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono uppercase tracking-[0.2em] text-foreground">noizu.direct</span>
            <span aria-hidden="true">·</span>
            <span>Data controller: NOIZU, Kuala Lumpur</span>
            <span aria-hidden="true">·</span>
            <span>Companion to our Privacy Policy</span>
          </div>
        </div>
      </section>
    </div>
  )
}
