import { prisma } from '@/lib/prisma'
import { Quote } from 'lucide-react'

export default async function CreatorSpotlightSection() {
  const spotlights = await prisma.creatorSpotlight.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  })

  if (spotlights.length === 0) return null

  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">
            Creator Stories
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Real creators. Real earnings.
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            These are their words — not ours.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {spotlights.map((s) => (
            <div
              key={s.id}
              className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-5 hover:border-primary/30 transition-colors"
            >
              {/* Earnings stat — the hero number */}
              <div>
                <div className="text-3xl font-extrabold text-foreground">{s.earningsStat}</div>
                <div className="text-xs text-muted-foreground mt-0.5">in their {s.earningsPeriod}</div>
              </div>

              {/* Quote */}
              <div className="relative flex-1">
                <Quote className="w-5 h-5 text-primary/30 mb-2" />
                <p className="text-sm text-foreground leading-relaxed italic">&ldquo;{s.quote}&rdquo;</p>
              </div>

              {/* Creator info */}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: s.avatarColor }}
                >
                  {s.avatarInitials}
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">{s.displayName}</div>
                  <div className="text-xs text-muted-foreground">{s.creatorType}</div>
                  <div className="text-xs text-muted-foreground">{s.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
