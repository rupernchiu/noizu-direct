'use client'

import { Search, ShieldCheck, Package, Store, TrendingUp, Wallet } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const buyerSteps = [
  {
    icon: Search,
    step: '01',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.1)',
    title: 'Find creators you love',
    body: 'Browse verified SEA artists, doujin creators and cosplay makers. Filter by category, style or convention.',
  },
  {
    icon: ShieldCheck,
    step: '02',
    color: '#00d4aa',
    bg: 'rgba(0,212,170,0.1)',
    title: 'Your payment is protected',
    body: 'Funds are held in escrow — you only release payment when your order arrives as described. Zero risk.',
    badge: 'Escrow Protected',
  },
  {
    icon: Package,
    step: '03',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    title: 'Get your order',
    body: 'Digital files delivered instantly. Physical items tracked with courier links. Direct from the creator to you.',
  },
] as const

const creatorSteps = [
  {
    icon: Store,
    step: '01',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.1)',
    title: 'Your store, ready in 10 minutes',
    body: 'List digital downloads, physical merch, print-on-demand products or commissions. Full control over pricing and availability.',
  },
  {
    icon: TrendingUp,
    step: '02',
    color: '#00d4aa',
    bg: 'rgba(0,212,170,0.1)',
    title: 'Reach fans across SEA',
    body: 'Buyers from Malaysia, Singapore, Philippines, Indonesia and beyond. Built-in discovery, trending algorithm and fan messaging.',
  },
  {
    icon: Wallet,
    step: '03',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    title: 'Earn safely, every time',
    body: 'Funds held in escrow protect you from chargebacks. Withdraw to your local bank via Airwallex — MYR, SGD, PHP and more.',
  },
] as const

type Step = {
  icon: React.ElementType
  step: string
  color: string
  bg: string
  title: string
  body: string
  badge?: string
}

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon
  return (
    <div className="relative bg-card rounded-2xl border border-border p-6 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: step.bg }}
        >
          <Icon size={22} style={{ color: step.color }} aria-hidden="true" />
        </div>
        <span
          className="text-4xl font-black leading-none select-none"
          style={{ color: `${step.color}22` }}
          aria-hidden="true"
        >
          {step.step}
        </span>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-foreground text-base leading-snug">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
      </div>

      {step.badge && (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit"
          style={{ backgroundColor: step.bg, color: step.color }}
        >
          <ShieldCheck size={11} aria-hidden="true" />
          {step.badge}
        </span>
      )}
    </div>
  )
}

export function AudienceTabs() {
  return (
    <Tabs defaultValue="buyer" className="w-full">
      <div className="flex justify-center mb-10">
        <TabsList className="h-auto p-1.5 rounded-2xl gap-0.5">
          <TabsTrigger
            value="buyer"
            className="px-8 py-2.5 rounded-xl text-sm font-semibold data-active:text-primary transition-all"
          >
            I'm a Buyer
          </TabsTrigger>
          <TabsTrigger
            value="creator"
            className="px-8 py-2.5 rounded-xl text-sm font-semibold data-active:text-secondary transition-all"
          >
            I'm a Creator
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="buyer">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {buyerSteps.map((step) => (
            <StepCard key={step.step} step={step as Step} />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="creator">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {creatorSteps.map((step) => (
            <StepCard key={step.step} step={step as Step} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}
