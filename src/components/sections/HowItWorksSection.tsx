import { Search, Lock, Heart } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Step {
  number: string
  icon: LucideIcon
  title: string
  description: string
  color: string
}

const steps: Step[] = [
  {
    number: '01',
    icon: Search,
    title: 'Discover',
    description: 'Browse original art, doujin, cosplay prints and merch from Southeast Asian creators.',
    color: '#7c3aed',
  },
  {
    number: '02',
    icon: Lock,
    title: 'Buy with Protection',
    description: 'Your payment is held securely in escrow until you receive your order.',
    color: '#00d4aa',
  },
  {
    number: '03',
    icon: Heart,
    title: 'Support Creators Directly',
    description: 'Every purchase goes straight to the creator. No middlemen, no markups.',
    color: '#ec4899',
  },
]

export default function HowItWorksSection() {
  return (
    <section className="bg-surface border-y border-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            From discovery to delivery — buying on NOIZU&#8209;DIRECT is simple, safe, and rewarding for creators.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="relative flex flex-col items-center text-center px-4">
                {/* Large background number */}
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 text-8xl font-black leading-none select-none pointer-events-none"
                  style={{ color: step.color, opacity: 0.05 }}
                  aria-hidden="true"
                >
                  {step.number}
                </span>

                {/* Icon circle */}
                <div
                  className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${step.color}20` }}
                >
                  <Icon size={24} style={{ color: step.color }} strokeWidth={2} />
                </div>

                {/* Step number badge */}
                <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Step {step.number}
                </span>

                <h3 className="mb-2 text-lg font-bold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
