import Link from 'next/link'

interface Tier {
  name: string
  price: string
  turnaround: string
  description: string
  status: 'open' | 'limited' | 'closed'
  statusLabel: string
}

const tiers: Tier[] = [
  {
    name: 'Sketch',
    price: 'RM 35',
    turnaround: '~5 days',
    description: 'Clean lineart, one character, your pose choice',
    status: 'open',
    statusLabel: '4 slots open',
  },
  {
    name: 'Colored Portrait',
    price: 'RM 75',
    turnaround: '~10 days',
    description: 'Bust-up, full color, shading included',
    status: 'limited',
    statusLabel: '2 slots open',
  },
  {
    name: 'Full Scene',
    price: 'RM 150',
    turnaround: '~21 days',
    description: 'Full body + detailed background, complex scenes welcome',
    status: 'closed',
    statusLabel: 'CLOSED',
  },
]

const statusStyles: Record<Tier['status'], string> = {
  open: 'bg-green-500/10 text-green-600 border border-green-500/20',
  limited: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  closed: 'bg-muted text-muted-foreground border border-border',
}

export default function CommissionSpotlightSection() {
  return (
    <section className="bg-background border-b border-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
            Unique to noizu.direct
          </span>
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl mb-4">
            Stop managing commissions in DMs and spreadsheets.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Set your tiers, open your queue, let buyers book — all from your dashboard. Your fans see your pricing clearly. You see your queue clearly. Everyone&rsquo;s happy.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {tiers.map((tier) => (
            <div key={tier.name} className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-foreground text-base">{tier.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyles[tier.status]}`}>
                  {tier.statusLabel}
                </span>
              </div>
              <p className="text-2xl font-extrabold text-foreground mb-1">{tier.price}</p>
              <p className="text-xs text-muted-foreground mb-3">Turnaround: {tier.turnaround}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/register/creator"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Set up your commission menu &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}
