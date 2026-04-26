import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Inbox,
  MessageSquare,
  ShieldCheck,
  Flag,
  Clock,
  Archive,
  AlertTriangle,
  ArrowRight,
  Ticket,
} from 'lucide-react'

export const metadata = { title: 'How tickets work' }

type Step = {
  icon: React.ElementType
  step: string
  color: string
  bg: string
  title: string
  body: string
}

const steps: Step[] = [
  {
    icon: Inbox,
    step: '01',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.1)',
    title: 'You open the ticket',
    body:
      'You\'re always the one who starts the conversation. Open a ticket from a creator\'s storefront with the "Leave a message" box, or from your order, commission, or quote page. Creators can\'t DM you first — this keeps your inbox spam-free.',
  },
  {
    icon: MessageSquare,
    step: '02',
    color: '#00d4aa',
    bg: 'rgba(0,212,170,0.1)',
    title: 'One ticket per inquiry',
    body:
      'Each new request gets its own ticket — never mixed with past conversations. If you later open a dispute, the evidence for that specific order or commission stays focused and easy to follow.',
  },
  {
    icon: ShieldCheck,
    step: '03',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    title: 'Auto-opened when you pay',
    body:
      'When you submit a commission request, accept a quote and pay, or complete an order, a ticket opens automatically and links to that record. You don\'t have to chase the creator — the conversation starts itself.',
  },
  {
    icon: Clock,
    step: '04',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    title: 'The creator closes when done',
    body:
      'Only the creator can close the ticket — when the work is delivered, the order is resolved, or the question is answered. If you\'re not happy yet, say so in the ticket; they can\'t close it while a dispute is active or money is still in escrow.',
  },
  {
    icon: Archive,
    step: '05',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    title: '90 days to keep your records',
    body:
      'Closed tickets stay readable for 90 days — download any attachments, save proof of what was agreed, and pull evidence if you need to raise a dispute later. After 90 days the ticket is permanently purged for everyone\'s privacy.',
  },
] as const

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
    </div>
  )
}

const faqs = [
  {
    q: 'How do I start a ticket with a creator?',
    a: 'Go to their storefront and use the "Leave a message" box — that opens a GENERAL ticket you can use for any question. If you\'re commissioning them, use the "Request commission" button instead, which auto-opens a COMMISSION ticket tied to the formal request. For purchases, a ticket opens automatically the moment your payment goes through.',
  },
  {
    q: 'Why can\'t the creator message me first?',
    a: 'Creators can only reply inside a ticket you\'ve already opened. This protects you from cold DMs, sales pitches, and harassment — your inbox is full of real conversations you chose to start. The one exception is automatic tickets: when you pay for an order or submit a commission request, the system opens the ticket on your behalf so the creator can respond.',
  },
  {
    q: 'Why a new ticket for every inquiry instead of one chat?',
    a: 'If you ask about commissions in January, buy a digital download in March, and have a shipping problem in May, those are three separate topics. Keeping each as its own ticket means the records stay focused — and if you ever need to raise a dispute, the evidence for that specific transaction is not buried in unrelated chat history.',
  },
  {
    q: 'Which tickets open automatically?',
    a: 'Three events open a ticket for you: (1) submitting a commission request, (2) accepting a quote and paying for a commission, (3) completing payment on any product order. Each ticket is linked to the underlying record so you can jump straight from the ticket to the order or request details.',
  },
  {
    q: 'Can I close a ticket myself?',
    a: 'No — only creators can close tickets. If you\'re done with the conversation, you can just stop replying; if it\'s a GENERAL ticket and both sides go quiet for 30 days, it auto-closes. For tickets tied to an order or commission, the creator closes it once everything is resolved (delivered, released, or refunded).',
  },
  {
    q: 'What happens when a ticket is closed?',
    a: 'You can still read all the messages and download attachments for 90 days — this is your record of what was agreed. Neither side can send new messages unless the ticket is reopened. After 90 days, the ticket and its attachments are permanently deleted. Tickets with an active dispute stay available until the dispute resolves.',
  },
  {
    q: 'What if a creator is rude, scammy, or asks me to go off-platform?',
    a: 'Use the Report button on the specific message — that flags it to platform moderation without you having to confront them first. If they\'re pushing you to move the conversation to Discord, email, or another site, that\'s a red flag: on-platform tickets are what protect your payment and your dispute rights. Keep everything here.',
  },
  {
    q: 'Can I reopen a closed ticket?',
    a: 'A closed ticket can be reopened within the 90-day retention window — useful if you realise you need to raise a concern after the fact. Use the reopen button on the ticket page. After 90 days, the ticket is gone and can\'t be recovered, so download any files you want to keep before then.',
  },
  {
    q: 'Is anyone else reading my messages?',
    a: 'Day-to-day, no — your ticket conversations are between you and the creator only. The platform does not read them. If you open a dispute, or if either side reports a specific message for abuse, moderators can review the ticket as part of that case. Every such access is logged.',
  },
]

export default async function BuyerTicketsHowItWorksPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="size-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">How tickets work</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every conversation you have with a creator on noizu.direct lives inside a ticket —
          scoped to a single inquiry, auto-opened when money is on the line, and retained as
          your official record if anything goes wrong.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {steps.map((s) => (
          <StepCard key={s.step} step={s} />
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
            <Ticket className="size-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-foreground">The four kinds of ticket</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5">
              <li><span className="text-foreground font-semibold">GENERAL</span> — a question or interest you send from a creator&apos;s storefront. No order or money attached.</li>
              <li><span className="text-foreground font-semibold">COMMISSION</span> — opens when you submit a commission request. Upgrades to QUOTE once the creator sends you a quote.</li>
              <li><span className="text-foreground font-semibold">QUOTE</span> — a quote you&apos;ve received (with or without a prior request). Upgrades to ORDER when you accept and pay.</li>
              <li><span className="text-foreground font-semibold">ORDER</span> — opens automatically when you pay for any product. Stays open until payout settles or the dispute resolves.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex gap-3">
          <Clock className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Key timings at a glance</p>
            <ul className="mt-2 text-xs text-muted-foreground space-y-1 leading-relaxed">
              <li>• <span className="text-foreground">30 days</span> — two-sided silence auto-closes GENERAL tickets</li>
              <li>• <span className="text-foreground">90 days</span> — closed tickets stay readable, then purge</li>
              <li>• <span className="text-foreground">Never</span> — tickets with an open dispute don&apos;t purge</li>
              <li>• <span className="text-foreground">5 / hour</span> — you can open up to 5 new tickets per hour</li>
            </ul>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex gap-3">
          <Flag className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Something feels wrong?</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Hit the Report button on any message to flag it to moderators — no need to
              argue with the creator first. If money is involved and the creator isn&apos;t
              delivering, open a{' '}
              <Link href="/account/disputes" className="text-primary hover:underline">
                dispute
              </Link>
              {' '}instead so noizu.direct can mediate.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 flex items-start gap-3">
        <AlertTriangle className="size-5 text-yellow-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Keep the conversation on-platform</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If a creator asks you to continue in Discord, email, or any external chat, that&apos;s
            a red flag — and it voids the protection the ticket gives you. Every payment, every
            delivery, every agreement needs to live inside the ticket so we have a record if
            something goes wrong.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-foreground mb-4">Common questions</h3>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <details
              key={i}
              className="group bg-card rounded-xl border border-border open:border-primary/30 transition-colors"
            >
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none">
                <span className="font-semibold text-sm text-foreground leading-snug">{f.q}</span>
                <ArrowRight className="size-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <p className="font-semibold text-foreground">Ready to reach a creator?</p>
          <p className="text-sm text-muted-foreground mt-1">Open a ticket from any creator&apos;s storefront, or check on the ones you already have.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/creators"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-border text-foreground hover:border-primary/40 transition-colors"
          >
            Browse creators
          </Link>
          <Link
            href="/account/tickets"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            My tickets
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
