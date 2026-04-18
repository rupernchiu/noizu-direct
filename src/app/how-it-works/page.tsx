import type { Metadata } from 'next'
import { CreditCard, Lock, BadgeCheck, ArrowRight } from 'lucide-react'
import { AudienceTabs } from './AudienceTabs'
import { FaqAccordion } from './FaqAccordion'

export const metadata: Metadata = {
  title: 'How noizu.direct Works | SEA Creator Marketplace',
  description:
    'Learn how to buy from and sell on noizu.direct — escrow-protected payments, verified SEA creators, and a marketplace built for cosplay, doujin, and fan art.',
  alternates: { canonical: 'https://noizu.direct/how-it-works' },
}

const escrowSteps = [
  {
    icon: CreditCard,
    step: '01',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.1)',
    label: 'Buyer Pays',
    detail: 'Payment captured at checkout and secured immediately.',
    featured: false,
  },
  {
    icon: Lock,
    step: '02',
    color: '#00d4aa',
    bg: 'rgba(0,212,170,0.1)',
    label: 'Held Safely',
    detail: 'Funds sit in escrow — protected until delivery is confirmed.',
    badge: 'Protected by noizu.direct',
    featured: true,
  },
  {
    icon: BadgeCheck,
    step: '03',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.1)',
    label: 'Released to Creator',
    detail: 'Funds release the moment the buyer confirms their order.',
    featured: false,
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden min-h-[320px] flex flex-col items-center justify-center text-center text-white pt-16 pb-16"
        style={{
          background:
            'linear-gradient(135deg, #7c3aed 0%, #5b21b6 45%, #0d9488 75%, #00d4aa 100%)',
        }}
      >
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />
        {/* Decorative orbs */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: '#00d4aa' }}
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: '#7c3aed' }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-5">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            How noizu.direct Works
          </h1>
          <p className="text-lg sm:text-xl text-white/75 max-w-xl leading-relaxed">
            The SEA creator marketplace built on trust, transparency and fan culture
          </p>
        </div>
      </section>

      {/* ── Audience Toggle + Steps ───────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            Choose your path
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm sm:text-base">
            Whether you&apos;re here to discover or to create, we&apos;ve got you covered.
          </p>
        </div>
        <AudienceTabs />
      </section>

      {/* ── Escrow Explainer ──────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 text-primary"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <Lock size={12} aria-hidden="true" />
              How escrow protects everyone
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Your money is always safe
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4">
            {escrowSteps.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={item.step} className="flex flex-col sm:flex-row items-center gap-4 flex-1">
                  <div
                    className="flex flex-col items-center text-center gap-4 rounded-2xl border p-6 w-full transition-shadow hover:shadow-md"
                    style={{
                      borderColor: item.featured ? `${item.color}40` : undefined,
                      borderWidth: item.featured ? '2px' : undefined,
                      backgroundColor: item.featured
                        ? 'var(--color-card)'
                        : 'var(--color-card)',
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.bg }}
                    >
                      <Icon size={26} style={{ color: item.color }} aria-hidden="true" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div
                        className="text-xs font-semibold uppercase tracking-widest"
                        style={{ color: item.featured ? item.color : undefined }}
                      >
                        {item.featured ? (
                          <span style={{ color: item.color }}>Step {item.step}</span>
                        ) : (
                          <span className="text-muted-foreground">Step {item.step}</span>
                        )}
                      </div>
                      <h3 className="font-bold text-foreground">{item.label}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                    </div>
                    {item.badge && (
                      <span
                        className="text-[11px] font-semibold px-3 py-1 rounded-full"
                        style={{ backgroundColor: item.bg, color: item.color }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {i < escrowSteps.length - 1 && (
                    <div className="flex-shrink-0 rotate-90 sm:rotate-0 text-muted-foreground" aria-hidden="true">
                      <ArrowRight size={20} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
            Common questions
          </h2>
        </div>
        <FaqAccordion />
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      <section className="bg-muted/40 border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Buyer card */}
            <div
              className="rounded-2xl p-8 text-white flex flex-col gap-6"
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #00d4aa 100%)' }}
            >
              <div className="flex flex-col gap-2">
                <div className="text-white/70 text-xs font-semibold uppercase tracking-widest">
                  For Buyers
                </div>
                <h3 className="text-xl font-extrabold">Start buying</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Discover original art, doujin, cosplay merch and commissions from verified SEA
                  creators. Every purchase is escrow-protected.
                </p>
              </div>
              <a
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white font-semibold rounded-xl text-sm transition-all hover:bg-white/90 w-fit min-h-[44px]"
                style={{ color: '#0d9488' }}
              >
                Browse Marketplace
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>

            {/* Creator card */}
            <div
              className="rounded-2xl p-8 text-white flex flex-col gap-6"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
            >
              <div className="flex flex-col gap-2">
                <div className="text-white/70 text-xs font-semibold uppercase tracking-widest">
                  For Creators
                </div>
                <h3 className="text-xl font-extrabold">Start selling</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Set up your store in 10 minutes and reach fans across Southeast Asia. 0% platform
                  fee during our launch period.
                </p>
              </div>
              <a
                href="/register/creator"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white font-semibold rounded-xl text-sm transition-all hover:bg-white/90 w-fit min-h-[44px]"
                style={{ color: '#7c3aed' }}
              >
                Start Selling Free
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}
