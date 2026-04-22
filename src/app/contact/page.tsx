import type { Metadata } from 'next'
import Link from 'next/link'
import { ContactForm } from '@/components/ui/ContactForm'
import {
  ArrowUpRight,
  Mail,
  MapPin,
  Clock,
  LifeBuoy,
  Briefcase,
  Newspaper,
  Handshake,
  MessageSquare,
  ShieldCheck,
  Users,
  Store,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact noizu.direct | SEA Creator Marketplace',
  description:
    'Get in touch with the noizu.direct team. Support, partnerships, press, and trust & safety — routed to the right inbox so we can reply within one business day.',
  alternates: { canonical: 'https://noizu.direct/contact' },
  openGraph: {
    title: 'Contact noizu.direct | SEA Creator Marketplace',
    description:
      'Write to the noizu.direct team. Support, partnerships, press, and trust & safety.',
    url: 'https://noizu.direct/contact',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'Contact noizu.direct' }],
  },
}

const HERO_PILLS = [
  { icon: Clock, label: 'Replies within 1 business day' },
  { icon: MapPin, label: 'Based in Kuala Lumpur' },
  { icon: ShieldCheck, label: 'Humans, not bots' },
] as const

const TOPICS = [
  {
    icon: LifeBuoy,
    title: 'Orders & support',
    body: 'Missing parcels, payment issues, account access, disputes, refunds.',
    tone: 'primary' as const,
  },
  {
    icon: Store,
    title: 'Creator help',
    body: 'Onboarding, KYC, payouts, product listings, commission workflow.',
    tone: 'accent' as const,
  },
  {
    icon: Handshake,
    title: 'Partnerships',
    body: 'Conventions, brand collaborations, event drops, integrations.',
    tone: 'primary' as const,
  },
  {
    icon: Newspaper,
    title: 'Press',
    body: 'Interview requests, data and trend briefings, press kit, imagery.',
    tone: 'accent' as const,
  },
  {
    icon: Briefcase,
    title: 'Business enquiries',
    body: 'Vendor outreach, legal, accounting, and institutional questions.',
    tone: 'primary' as const,
  },
  {
    icon: ShieldCheck,
    title: 'Trust & safety',
    body: 'Counterfeit reports, impersonation, urgent takedowns, abuse.',
    tone: 'accent' as const,
  },
] as const

const TEAM_INBOXES = [
  { label: 'General', email: 'hello@noizu.direct', note: 'Anything that does not fit a specific inbox.' },
  { label: 'Support', email: 'support@noizu.direct', note: 'Order, payment, account, dispute issues.' },
  { label: 'Creators', email: 'creators@noizu.direct', note: 'Creator onboarding, payouts, commissions.' },
  { label: 'Partnerships', email: 'partnerships@noizu.direct', note: 'Conventions, brands, event drops.' },
  { label: 'Press', email: 'press@noizu.direct', note: 'Journalist and media enquiries.' },
  { label: 'Trust & safety', email: 'abuse@noizu.direct', note: 'Counterfeits, impersonation, abuse.' },
] as const

export default function ContactPage() {
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
            <span className="text-primary">Contact</span>
            <span className="w-8 h-px bg-border" aria-hidden="true" />
            <span>Talk to the team</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-foreground max-w-3xl leading-[1.1]">
            Get in touch with noizu.direct
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-[1.65]">
            Send us a message below, or write directly to the inbox that fits
            your topic. Every message is read by a real human on the team —
            we aim to reply within one business day, Monday to Friday.
          </p>

          <ul className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-2" aria-label="Contact at a glance">
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
              href="/help"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              Browse the Help Centre
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <a
              href="mailto:hello@noizu.direct"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
            >
              hello@noizu.direct
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Form + side info ─────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12">

            {/* Left: quick facts + help card */}
            <aside className="lg:col-span-2 flex flex-col gap-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-bold text-foreground mb-5">At a glance</h2>
                <div className="flex flex-col gap-5">

                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                    >
                      <Mail size={18} className="text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                        General email
                      </p>
                      <a
                        href="mailto:hello@noizu.direct"
                        className="text-sm font-semibold text-foreground hover:text-primary break-all"
                      >
                        hello@noizu.direct
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
                    >
                      <MapPin size={18} style={{ color: '#0d9488' }} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                        Based in
                      </p>
                      <p className="text-sm font-semibold text-foreground">Kuala Lumpur, Malaysia</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Serving SEA creators & fans</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                    >
                      <Clock size={18} className="text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                        Response time
                      </p>
                      <p className="text-sm font-semibold text-foreground">1–2 business days</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Mon–Fri, 9am–6pm MYT</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/40 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={16} className="text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-foreground">Before you write</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  A lot of common questions already have a detailed answer in our Help Centre —
                  check there first if you&rsquo;re in a hurry.
                </p>
                <Link
                  href="/help"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline underline-offset-4"
                >
                  Browse the Help Centre
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </aside>

            {/* Right: form */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <div className="mb-6 pb-6 border-b border-border">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Send us a message
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Fill in the form and we&rsquo;ll route your message to the right person on the team.
                  </p>
                </div>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Topics we can help with ──────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              What we can help with
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Six kinds of message we answer daily
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Pick whichever is closest to your question — there&rsquo;s no wrong choice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOPICS.map(({ icon: Icon, title, body, tone }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6">
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team inboxes ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 text-primary"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <Users size={12} aria-hidden="true" />
              Dedicated inboxes
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Prefer email? Write direct.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Messages sent to a specific inbox get to the right team immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEAM_INBOXES.map(({ label, email, note }) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-[0_4px_24px_rgba(124,58,237,0.08)]"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(124,58,237,0.10)' }}
                >
                  <Mail size={18} className="text-primary" aria-hidden="true" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  {label}
                </p>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary break-all mb-2 transition-colors">
                  {email}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{note}</p>
              </a>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono uppercase tracking-[0.2em] text-foreground">noizu.direct</span>
            <span aria-hidden="true">·</span>
            <span>Kuala Lumpur, Malaysia</span>
            <span aria-hidden="true">·</span>
            <span>Legitimate emails are always from @noizu.direct</span>
          </div>
        </div>
      </section>
    </div>
  )
}
