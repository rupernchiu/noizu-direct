'use client'

import { useState } from 'react'
import { LayoutDashboard, ShoppingBag, Banknote, Search, Lock, Heart } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Step {
  number: string
  icon: LucideIcon
  title: string
  description: string
  color: string
}

const creatorSteps: Step[] = [
  {
    number: '01',
    icon: LayoutDashboard,
    title: 'List your work',
    description: 'Upload your products or set your commission tiers. Takes about 10 minutes. No tech skills needed.',
    color: '#7c3aed',
  },
  {
    number: '02',
    icon: ShoppingBag,
    title: 'Fans discover and buy',
    description: 'Your storefront is live immediately. Buyers can find you through the marketplace or your direct link.',
    color: '#00d4aa',
  },
  {
    number: '03',
    icon: Banknote,
    title: 'Get paid. Guaranteed.',
    description: 'Every purchase goes into escrow. The moment your buyer confirms delivery, funds release to your account. 0% platform fee during our launch.',
    color: '#ec4899',
  },
]

const buyerSteps: Step[] = [
  {
    number: '01',
    icon: Search,
    title: 'Discover creators',
    description: 'Browse original art, doujin, cosplay prints, and handmade merch from verified SEA creators.',
    color: '#7c3aed',
  },
  {
    number: '02',
    icon: Lock,
    title: 'Buy with full protection',
    description: 'Your payment is held in escrow. If something goes wrong, you\'re covered. You only pay when you\'re happy.',
    color: '#00d4aa',
  },
  {
    number: '03',
    icon: Heart,
    title: 'Support creators directly',
    description: 'Every purchase goes straight to the creator. No middlemen. Your money supports the art you love.',
    color: '#ec4899',
  },
]

type Tab = 'creator' | 'buyer'

export default function HowItWorksSection() {
  const [activeTab, setActiveTab] = useState<Tab>('creator')

  const steps = activeTab === 'creator' ? creatorSteps : buyerSteps
  const subheading =
    activeTab === 'creator'
      ? 'Start earning from your art in three steps.'
      : 'Buying from independent creators, made simple.'

  return (
    <section className="bg-surface border-y border-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Whether you create or collect — NOIZU&#8209;DIRECT is built for you.
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-muted rounded-xl p-1">
            <button
              onClick={() => setActiveTab('creator')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'creator'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              I&apos;m a Creator
            </button>
            <button
              onClick={() => setActiveTab('buyer')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'buyer'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              I&apos;m a Buyer
            </button>
          </div>
        </div>

        {/* Sub-heading above grid */}
        <p className="text-center text-base font-semibold text-foreground mb-10">
          {subheading}
        </p>

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
                  {step.number}
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
