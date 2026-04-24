import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Inbox,
  FileText,
  Lock,
  Palette,
  Coins,
  ShieldCheck,
  Clock,
  ArrowRight,
} from 'lucide-react'

export const metadata = { title: 'How commissions work | noizu.direct' }

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
    title: 'A commission comes to you',
    body:
      'Either a buyer sends you a request through your storefront, or you send them a standalone quote directly. Requests land in your Inbox here.',
  },
  {
    icon: FileText,
    step: '02',
    color: '#00d4aa',
    bg: 'rgba(0,212,170,0.1)',
    title: 'You write the quote',
    body:
      'Set the scope, price, turnaround and revisions. Choose a single quote (with a deposit %) or break big jobs into milestones. Send it — the buyer has 7 days to accept.',
  },
  {
    icon: Lock,
    step: '03',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    title: 'Buyer pays — we hold it',
    body:
      'The buyer accepts your quote and pays the full amount upfront, plus a processing fee. Funds sit in escrow with noizu.direct — not with you. You (the creator) then have 48 hours to formally accept the commission; if you miss that window, it auto-cancels and the buyer is refunded in full.',
  },
  {
    icon: Palette,
    step: '04',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    title: 'You do the work and deliver',
    body:
      'Mark milestones as delivered (or the whole thing, for single quotes). Buyer has 14 days per milestone to approve or request a revision — 14 days of silence counts as approval.',
  },
  {
    icon: Coins,
    step: '05',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    title: 'Payment releases to your balance',
    body:
      'Milestone quotes: each slice releases as the buyer approves. Single quotes: your deposit releases 48h after you accept, the balance 30 days after delivery (or sooner if the buyer approves).',
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
    q: 'Where does the buyer actually see my quote and milestones?',
    a: 'The moment you send the quote, the buyer gets a notification and it appears in their account under "Quotes offered to you". They see the title, description, amount, deposit %, revisions, turnaround and any terms you set. If it\'s milestone-based, every milestone is listed with its own title, description and amount. Once they accept and pay, the same breakdown stays visible inside the commission order — so they always know the scope they agreed to.',
  },
  {
    q: 'Do I mark milestones as delivered, and does the buyer see that?',
    a: 'Yes. You mark each milestone as delivered from the commission order page — optionally with a short delivery note. The milestone flips to "Delivered" on the buyer\'s side immediately, the note shows up, and they get Approve or Request Revision buttons. When they approve, that slice of the payment releases to your balance. If they don\'t respond within 14 days, it auto-approves and releases anyway. You can never release it yourself — the state machine enforces that.',
  },
  {
    q: 'What does a deposit % actually do?',
    a: 'On single quotes (not milestone-based), the deposit % controls how much releases to you early — 48 hours after you accept the commission. For example, a 30% deposit on a $500 quote means $150 releases to your balance so you can start work, and the remaining $350 releases 30 days after you deliver (or sooner if the buyer approves). The buyer still pays the full amount up front either way — the deposit % just shifts when your share reaches you.',
  },
  {
    q: 'When should I use milestones instead of a single quote?',
    a: 'Use milestones for bigger jobs where the buyer wants to see progress before committing to the whole thing. You break the work into 2–10 stages (e.g. sketch → lineart → colour → final). Each stage has its own amount. The buyer approves stage-by-stage, and each slice releases to you as they approve. If you only have a short turnaround or a simple deliverable, a single quote with a deposit is simpler.',
  },
  {
    q: 'What happens if I miss the 48-hour acceptance window?',
    a: 'The commission auto-cancels. The buyer gets a full refund, and the order is closed automatically. If you know you can\'t hit the deadline, reject the quote or contact the buyer to rework it — don\'t let it lapse silently, since repeated expiries hurt your account standing.',
  },
  {
    q: 'Can I release my own payment?',
    a: 'No. This is by design, and it\'s what makes buyers comfortable paying upfront. Funds release only when the buyer approves, or after the auto-release window (14 days per milestone, 30 days on single-quote balances). You never need to chase the buyer — the clock protects you too.',
  },
  {
    q: 'What about revisions?',
    a: 'Each quote includes a number of revisions you set. If the buyer requests a revision on a delivered milestone, the clock resets and they use one of their allowance. Beyond the allowance, you can agree to more as an extra or decline — your call. Be honest about your revision count up front; buyers pick creators who are clear about scope.',
  },
  {
    q: 'What if the buyer disappears or disputes the work?',
    a: 'If the buyer goes silent after you deliver, the auto-release window takes care of it — you get paid without having to chase. If they raise a formal dispute, noizu.direct mediates. Keep copies of delivery files, brief notes, and revision history — it all helps you make your case.',
  },
  {
    q: 'What fee does noizu.direct charge on commissions?',
    a: 'The buyer pays a processing fee (currently 2.5%) on top of your quote, so you receive the full amount you quoted minus your usual payout fees. You can see the exact breakdown the buyer sees on any quote — it\'s transparent on both sides.',
  },
]

export default async function CommissionsHowItWorksPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as { role?: string }).role !== 'CREATOR') redirect('/')

  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-foreground">How commissions work</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          From first request to final payout — here&apos;s exactly how commissions move through
          noizu.direct, and how you get paid safely along the way.
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
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-foreground">What the buyer sees</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              On the payment page, the buyer sees your quote title, the subtotal, the
              processing fee, and the total due — then a clear note explaining that their
              money goes into escrow, not to you. They&apos;re told you can&apos;t release
              funds on your own, and that the platform holds the money until they approve
              (or the auto-release window passes). This is what makes them comfortable paying
              up front. Your job is to deliver good work on time — the platform handles the
              trust.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex gap-3">
          <Clock className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Key timings at a glance</p>
            <ul className="mt-2 text-xs text-muted-foreground space-y-1 leading-relaxed">
              <li>• <span className="text-foreground">7 days</span> — buyer has to accept a sent quote</li>
              <li>• <span className="text-foreground">48 hours</span> — you have to accept the commission after payment</li>
              <li>• <span className="text-foreground">14 days</span> — buyer review window per delivered milestone</li>
              <li>• <span className="text-foreground">30 days</span> — balance auto-release after single-quote delivery</li>
            </ul>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex gap-3">
          <Palette className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Tune your defaults once</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Your <Link href="/dashboard/commissions/settings" className="text-primary hover:underline">commission settings</Link>{' '}
              pre-fill every new quote with your preferred deposit %, revisions, turnaround and
              terms. Setting them up once saves you time on every quote after.
            </p>
          </div>
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
          <p className="font-semibold text-foreground">Ready to send a quote?</p>
          <p className="text-sm text-muted-foreground mt-1">Configure your defaults first, then draft your first one.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/dashboard/commissions/settings"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-border text-foreground hover:border-primary/40 transition-colors"
          >
            Open settings
          </Link>
          <Link
            href="/dashboard/commissions/quotes/new"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            New quote
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
