import { Users, ShieldCheck, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Card {
  icon: LucideIcon
  fear: string
  answer: string
}

const cards: Card[] = [
  {
    icon: Users,
    fear: 'Will anyone actually buy from me?',
    answer:
      'Our buyers are fans. They come here specifically to support creators like you — not to scroll and leave. If you make it, there\'s someone here who wants it.',
  },
  {
    icon: ShieldCheck,
    fear: 'How do I know I\'ll get paid?',
    answer:
      'Every purchase goes into escrow the moment a buyer checks out. The money is yours the moment delivery is confirmed. We hold it — not the buyer, not some third party.',
  },
  {
    icon: MapPin,
    fear: 'Is this just another platform that\'ll disappear?',
    answer:
      'Built in Malaysia. We\'re in the Animangaki halls, the Comic Fiesta lines. This community is ours too. We\'re not going anywhere.',
  },
]

export default function CreatorPainPointsSection() {
  return (
    <section className="bg-surface border-y border-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            We built this because we&rsquo;ve been there
          </p>
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl mb-4">
            Still on the fence? So were we.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every creator who joined had the same three questions. Here&rsquo;s the honest answer to each.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.fear}
                className="bg-card rounded-2xl border border-border p-6"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-4">
                  <Icon size={20} className="text-primary" strokeWidth={2} />
                </div>
                <p className="font-semibold text-foreground text-lg mb-2">{card.fear}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.answer}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
