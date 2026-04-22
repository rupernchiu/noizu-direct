import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import sanitizeHtml from 'sanitize-html'
import {
  ArrowUpRight,
  ArrowRight,
  Mail,
  LifeBuoy,
  ShoppingBag,
  Store,
  CreditCard,
  Truck,
  ShieldCheck,
  MessageSquare,
  UserCircle2,
  Package,
  Palette,
  HelpCircle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Help Centre | noizu.direct',
  description:
    'Guides, answers, and support for buyers and creators on noizu.direct. Orders, payments, shipping, commissions, account, and trust & safety — all in one place.',
  alternates: { canonical: 'https://noizu.direct/help' },
  openGraph: {
    title: 'Help Centre | noizu.direct',
    description:
      'Guides and answers for buyers and creators on the noizu.direct marketplace.',
    url: 'https://noizu.direct/help',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'noizu.direct Help Centre' }],
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
  { icon: LifeBuoy, label: 'Guides for buyers & creators' },
  { icon: MessageSquare, label: '24h support reply' },
  { icon: ShieldCheck, label: 'Escrow-protected orders' },
] as const

const QUICK_LINKS = [
  {
    icon: ShoppingBag,
    title: 'Buying',
    body: 'Checkout, payment methods, tracking an order, downloading digital files.',
    href: '#buying',
    tone: 'primary' as const,
  },
  {
    icon: Store,
    title: 'Selling',
    body: 'Creator onboarding, listing products, shipping, payouts, commissions.',
    href: '#selling',
    tone: 'accent' as const,
  },
  {
    icon: CreditCard,
    title: 'Payments',
    body: 'Currencies, processing fees, escrow timing, refunds, chargebacks.',
    href: '#payments',
    tone: 'primary' as const,
  },
  {
    icon: Truck,
    title: 'Shipping',
    body: 'Addresses, tracking, print-on-demand, customs, damaged parcels.',
    href: '#shipping',
    tone: 'accent' as const,
  },
  {
    icon: UserCircle2,
    title: 'Account',
    body: 'Sign-in, two-factor, profile, notifications, closing your account.',
    href: '#account',
    tone: 'primary' as const,
  },
  {
    icon: ShieldCheck,
    title: 'Trust & safety',
    body: 'Disputes, takedowns, abuse reports, counterfeit, refund protection.',
    href: '#trust-safety',
    tone: 'accent' as const,
  },
] as const

const TOP_ASKS = [
  {
    icon: Package,
    title: 'Where is my order?',
    body: 'Sign in and open your order page. Physical orders show live tracking once the creator dispatches; digital orders unlock an instant download.',
    href: '/account/orders',
  },
  {
    icon: Palette,
    title: 'How do commissions work?',
    body: 'Payment sits in escrow through every commission stage and is only released when you accept the final delivery, or after 14 days of inactivity.',
    href: '#commissions',
  },
  {
    icon: CreditCard,
    title: 'Why was my card declined?',
    body: 'Most declines are 3DS failures or a mismatched billing country. Try a different card, or switch to a local payment method at checkout.',
    href: '#payments',
  },
  {
    icon: ShieldCheck,
    title: 'Something went wrong with an order',
    body: 'Open the order page and tap “Open a dispute.” We hold funds in escrow and most cases are resolved within five business days.',
    href: '#disputes',
  },
] as const

const SUPPORT_CHANNELS = [
  {
    label: 'General support',
    email: 'support@noizu.direct',
    note: 'Account, orders, payments, anything platform-related.',
  },
  {
    label: 'Creator & commission help',
    email: 'creators@noizu.direct',
    note: 'Onboarding, payouts, KYC, commission workflow.',
  },
  {
    label: 'Trust & safety',
    email: 'abuse@noizu.direct',
    note: 'Counterfeits, impersonation, abuse, urgent takedowns.',
  },
] as const

export default async function HelpPage() {
  const page = await prisma.page.findUnique({ where: { slug: 'help' } })

  const title = page?.title ?? 'Help Centre'
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
            <span className="text-primary">Help</span>
            <span className="w-8 h-px bg-border" aria-hidden="true" />
            <span>Support & guides</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-foreground max-w-3xl leading-[1.1]">
            {title}
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-[1.65]">
            Answers for buyers and creators. If you cannot find what you need
            here, write to <a href="mailto:support@noizu.direct" className="text-primary font-medium hover:underline underline-offset-4">support@noizu.direct</a> —
            we reply within one business day.
          </p>

          <ul className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-2" aria-label="Support at a glance">
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
              href="/contact"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Contact support
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Terms of Service
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
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

      {/* ── Quick links grid ─────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 text-primary"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <HelpCircle size={12} aria-hidden="true" />
              Browse by topic
            </span>
            <h2 id="topics" className="text-2xl sm:text-3xl font-extrabold text-foreground scroll-mt-28">
              What do you need help with?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Pick a topic to jump straight to the most common questions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {QUICK_LINKS.map(({ icon: Icon, title, body, href, tone }) => (
              <a
                key={title}
                href={href}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-[0_4px_24px_rgba(124,58,237,0.08)]"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        tone === 'primary' ? 'rgba(124,58,237,0.10)' : 'rgba(13,148,136,0.10)',
                    }}
                  >
                    <Icon
                      size={20}
                      style={{ color: tone === 'primary' ? '#7c3aed' : '#0d9488' }}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-base font-bold text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline underline-offset-4">
                  Jump to {title.toLowerCase()}
                  <ArrowRight size={12} aria-hidden="true" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top asks ─────────────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Most asked
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              The four questions we hear every week
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TOP_ASKS.map(({ icon: Icon, title, body, href }) => (
              <a
                key={title}
                href={href}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                  >
                    <Icon size={20} className="text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline underline-offset-4">
                      Read more
                      <ArrowRight size={12} aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CMS FAQ narrative ────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              In depth
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Detailed answers
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
                    {sections.length} topics
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
                      <strong>Coming soon.</strong> In-depth answers are being published here.
                      In the meantime, reach us directly at{' '}
                      <a href="mailto:support@noizu.direct">support@noizu.direct</a>.
                    </p>
                  </blockquote>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>

      {/* ── Support channels ─────────────────────────────────────── */}
      <section className="bg-muted/40 border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Still stuck?
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Talk to a real human
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Three dedicated inboxes so your message reaches the right team the first time.
              We reply within one business day, Mon–Fri.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SUPPORT_CHANNELS.map(({ label, email, note }) => (
              <div key={email} className="rounded-2xl border border-border bg-card p-6">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                >
                  <Mail size={20} className="text-primary" aria-hidden="true" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  {label}
                </p>
                <a
                  href={`mailto:${email}`}
                  className="block text-base font-semibold text-primary hover:underline underline-offset-4 break-all"
                >
                  {email}
                </a>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{note}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-95 min-h-[44px]"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
            >
              Use the contact form
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
