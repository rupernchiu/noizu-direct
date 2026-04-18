import type { Metadata } from 'next'
import { ShoppingBag, Lock, Download, LayoutDashboard, Users, Banknote, ChevronDown } from 'lucide-react'

export const metadata: Metadata = {
  title: 'How noizu.direct Works | SEA Creator Marketplace',
  description: 'Learn how to buy from and sell on noizu.direct — escrow-protected payments, verified SEA creators, and a marketplace built for cosplay, doujin, and fan art.',
  alternates: { canonical: 'https://noizu.direct/how-it-works' },
}

const buyerSteps = [
  {
    icon: ShoppingBag,
    color: '#7c3aed',
    title: 'Browse',
    description: 'Discover original art, doujin, cosplay merch and commissions from verified SEA creators across Malaysia, Singapore, Philippines, Indonesia and Thailand.',
  },
  {
    icon: Lock,
    color: '#00d4aa',
    title: 'Buy with confidence',
    description: 'Your payment is held in escrow the moment you check out. If something goes wrong, you are covered. Funds only release when you are happy.',
  },
  {
    icon: Download,
    color: '#ec4899',
    title: 'Download or receive',
    description: 'Digital files are available instantly after purchase. Physical items ship directly from the creator with tracking updates to your door.',
  },
]

const creatorSteps = [
  {
    icon: LayoutDashboard,
    color: '#7c3aed',
    title: 'Set up your store',
    description: 'Create your storefront in under 10 minutes. List digital products, physical merch, or open commission slots — no technical skills required.',
  },
  {
    icon: Users,
    color: '#00d4aa',
    title: 'Sell to SEA fans',
    description: 'Reach buyers across Malaysia, Singapore, Philippines and beyond. Your storefront is searchable from day one — no audience required to get started.',
  },
  {
    icon: Banknote,
    color: '#ec4899',
    title: 'Get paid safely',
    description: 'Every sale goes into escrow. The moment your buyer confirms delivery, funds release directly to your account. 0% platform fee during our launch period.',
  },
]

const faqs = [
  {
    q: 'What is escrow and why does noizu.direct use it?',
    a: 'Escrow means your payment is held by a neutral party — us — until the transaction is complete. Buyers are protected because funds only release on delivery. Creators are protected because the money is already secured before they start work. Everyone wins.',
  },
  {
    q: 'How long does it take to get paid as a creator?',
    a: 'Funds are released as soon as your buyer confirms delivery. For digital products this is typically instant or within hours. For physical orders it depends on the buyer confirming receipt. There is a short holding period after confirmation before withdrawal.',
  },
  {
    q: 'What currencies are supported?',
    a: 'Buyers can pay in MYR, SGD, USD, PHP, IDR and THB. Payouts to creators are made via Airwallex in your local currency. No hidden conversion charges.',
  },
  {
    q: 'Is fan art allowed on noizu.direct?',
    a: 'Yes. noizu.direct is fan art friendly. We operate under creator-responsibility guidelines — creators are responsible for ensuring their work complies with relevant IP guidelines. We do not police fan art aggressively, but we will act on legitimate takedown requests.',
  },
  {
    q: 'What happens if there is a dispute between a buyer and creator?',
    a: 'Either party can raise a dispute through the order page. Our team reviews the case, looks at evidence from both sides, and makes a fair decision. Escrow means the funds are available to resolve the outcome either way.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div className="bg-surface border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-4">
            How noizu.direct Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            A marketplace built for trust — escrow-protected payments, verified creators, and a community that loves what you make.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-20">

        {/* For Buyers */}
        <div>
          <div className="mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">For Buyers</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Support creators you love. Shop with confidence.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {buyerSteps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="bg-card rounded-2xl border border-border p-6">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${step.color}20` }}
                  >
                    <Icon size={20} style={{ color: step.color }} />
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    Step {i + 1}
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* For Creators */}
        <div>
          <div className="mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary">For Creators</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Turn your art into income. We handle the rest.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {creatorSteps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="bg-card rounded-2xl border border-border p-6">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${step.color}20` }}
                  >
                    <Icon size={20} style={{ color: step.color }} />
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    Step {i + 1}
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* FAQ */}
        <div>
          <div className="mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">FAQ</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
              Common questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group bg-card rounded-2xl border border-border px-6 py-5 open:border-primary/30 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                  <span className="font-semibold text-foreground">{faq.q}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-10 text-center">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join as a creator and set up your store in 10 minutes, or browse the marketplace and find something you love.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register/creator"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all text-base"
            >
              Start Selling Free
            </a>
            <a
              href="/marketplace"
              className="inline-flex items-center justify-center px-8 py-3.5 border border-border hover:border-primary/50 bg-card text-foreground font-semibold rounded-xl transition-all text-base"
            >
              Explore Marketplace
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
