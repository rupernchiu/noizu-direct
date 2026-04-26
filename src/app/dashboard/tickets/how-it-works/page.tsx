import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Inbox,
  MessageSquare,
  ShieldCheck,
  Ban,
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
    title: 'Buyers open tickets, not you',
    body:
      'Only buyers can open a ticket with you — from your storefront, the "Leave a message" box, or from their order/commission/quote page. You never have to manage a flood of DMs or decide who gets to reach you.',
  },
  {
    icon: MessageSquare,
    step: '02',
    color: '#00d4aa',
    bg: 'rgba(0,212,170,0.1)',
    title: 'Every inquiry is its own ticket',
    body:
      'Tickets are not threaded by buyer — each new request or order spawns its own ticket, so context stays tight and dispute evidence is never tangled across topics.',
  },
  {
    icon: ShieldCheck,
    step: '03',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    title: 'Auto-opened when money is on the line',
    body:
      'When a buyer submits a commission request, accepts your quote, or pays for an order, a ticket is opened automatically and linked to that record. You don\'t have to do anything — the paper trail starts itself.',
  },
  {
    icon: Clock,
    step: '04',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    title: 'You close the ticket when resolved',
    body:
      'Only creators can close a ticket. Close when the buyer is happy or the work is settled. A ticket with a pending order or active dispute can\'t be closed — the system protects both sides.',
  },
  {
    icon: Archive,
    step: '05',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    title: '90-day archive, then it\'s gone',
    body:
      'Closed tickets stay readable for 90 days as dispute evidence, then purge automatically. Idle open tickets (both sides silent for 30 days) auto-close if no money is at stake, so your inbox stays clean.',
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
    q: 'Can I message a buyer first?',
    a: 'No — buyers are the only ones who can open a ticket with you. You can reply, close, reopen, or block inside any ticket the buyer has opened, and you\'ll get auto-opened tickets whenever they submit a commission request, accept one of your quotes, or pay for an order. This rule prevents creator-initiated spam and keeps your inbox full of real intent.',
  },
  {
    q: 'Why separate tickets per inquiry instead of one long thread?',
    a: 'If a buyer asks about commissions in January, buys a digital download in March, and disputes a shipment in May, those are three unrelated conversations. Keeping them as separate tickets means dispute evidence for any one of them stays focused on that topic — much stronger than a scrolling DM thread that mixes contexts.',
  },
  {
    q: 'Which tickets open automatically?',
    a: 'Three events auto-open a ticket: (1) a buyer submits a commission request to you, (2) a buyer accepts a quote and pays for a commission, (3) a buyer completes an order on any of your products. In each case the ticket is linked to that record so you can click straight through from the ticket to the request/order details.',
  },
  {
    q: 'What\'s the difference between closing and blocking?',
    a: 'Closing a ticket is a normal resolution — you\'re saying "we\'re done, there\'s nothing more to sort out." Blocking a buyer is only for abuse or spam — it prevents them from opening any further tickets with you. Blocking does not close their existing open tickets (order/commission tickets still need to resolve), and admins can see your block list for dispute context.',
  },
  {
    q: 'Can I close a ticket tied to an active commission or order?',
    a: 'Not while payment is held in escrow, delivery is pending, or a dispute is active. The ticket page will tell you exactly what is blocking closure. Once the underlying commission/order fully resolves (delivered, released, or refunded), the "Close" button unlocks.',
  },
  {
    q: 'What happens when a ticket is closed?',
    a: 'The buyer can still read all the messages and download attachments for 90 days — this is crucial if they later need evidence for a dispute or tax record. Neither side can post new messages unless it is reopened. After 90 days the ticket, messages, and attachments are permanently purged. Active-dispute tickets stay past the 90 days until the dispute resolves.',
  },
  {
    q: 'Do I need to reply within a time limit?',
    a: 'There is no hard SLA, but buyer-facing responsiveness shows up on your profile. Tickets that sit idle on both sides for 30 days auto-close (for GENERAL tickets only — anything with money attached doesn\'t auto-close). If you need time to answer, post a brief "I\'ll get back to you by X" note so the clock doesn\'t bite you.',
  },
  {
    q: 'What counts as abuse? When should I report a message?',
    a: 'Threats, harassment, slurs, doxxing, fraud attempts, or anything that violates the platform rules. Use the Report button on a specific message — that flags it to moderation without you having to block first. For repeat offenders, block the buyer so they can\'t keep opening new tickets against you.',
  },
  {
    q: 'Are ticket messages admin-visible?',
    a: 'Only when escalated. Admins can open a ticket as part of a dispute investigation or a formal support case, and every such access is audited. Day-to-day, your ticket conversations are between you and the buyer — the platform does not read them.',
  },
]

export default async function TicketsHowItWorksPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as { role?: string }).role !== 'CREATOR') redirect('/')

  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-foreground">How tickets work</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Tickets are the official record of every buyer conversation you have — scoped per
          inquiry, auto-opened when money is on the line, and retained as dispute evidence.
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
            <h3 className="font-bold text-foreground">Four ticket kinds</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5">
              <li><span className="text-foreground font-semibold">GENERAL</span> — a buyer reaching out with a question or interest. No order, no commission, no quote attached.</li>
              <li><span className="text-foreground font-semibold">COMMISSION</span> — auto-opened when a buyer submits a commission request to you. Upgrades to QUOTE when you send a quote.</li>
              <li><span className="text-foreground font-semibold">QUOTE</span> — a quote you sent (with or without a prior request). Upgrades to ORDER when the buyer accepts and pays.</li>
              <li><span className="text-foreground font-semibold">ORDER</span> — auto-opened the moment a buyer pays for any product. Can only close after payout settles or dispute resolves.</li>
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
              <li>• <span className="text-foreground">30 days</span> — two-sided idle auto-closes GENERAL tickets</li>
              <li>• <span className="text-foreground">90 days</span> — closed tickets stay readable, then purge</li>
              <li>• <span className="text-foreground">Never</span> — tickets with an open dispute don&apos;t purge</li>
              <li>• <span className="text-foreground">5 / hour</span> — buyers are rate-limited when opening new tickets</li>
            </ul>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex gap-3">
          <Ban className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Block list, not banhammer</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Blocking a buyer stops them from opening new tickets with you, but doesn&apos;t remove
              existing order/commission tickets — those still need to resolve. Manage your block
              list from{' '}
              <Link href="/dashboard/tickets/blocks" className="text-primary hover:underline">
                Tickets › Blocks
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 flex items-start gap-3">
        <AlertTriangle className="size-5 text-yellow-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Tickets are evidence — act like it</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Everything you write inside a ticket can be surfaced during a dispute or legal request.
            Keep the tone professional, stick to facts and scope, and never ask a buyer to move the
            conversation off-platform — that invalidates the protection the ticket gives you both.
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
          <p className="font-semibold text-foreground">Back to your inbox</p>
          <p className="text-sm text-muted-foreground mt-1">Resolve what you can today — your responsiveness is visible to future buyers.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/dashboard/tickets/blocks"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-border text-foreground hover:border-primary/40 transition-colors"
          >
            Manage blocks
          </Link>
          <Link
            href="/dashboard/tickets"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Open inbox
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
