import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare,
  ShieldCheck,
  Palette,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  Sparkles,
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
    icon: MessageSquare,
    step: '01',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.1)',
    title: 'You send a request',
    body:
      'Tell the creator what you want, your budget range and when you need it. They\'ll reply with a quote — title, price, turnaround, revisions, and any terms.',
  },
  {
    icon: ShieldCheck,
    step: '02',
    color: '#00d4aa',
    bg: 'rgba(0,212,170,0.1)',
    title: 'You pay — we hold it',
    body:
      'When you accept the quote, you pay the full amount up front (plus a small processing fee). The money sits in escrow with noizu.direct — not with the creator.',
  },
  {
    icon: Palette,
    step: '03',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    title: 'The creator does the work',
    body:
      'They have 48 hours to formally accept your order, then start delivering. You\'ll get notified when they mark work as delivered — either in one drop, or milestone by milestone.',
  },
  {
    icon: CheckCircle2,
    step: '04',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    title: 'You approve — they get paid',
    body:
      'Review the delivery. Approve it, or use one of your revisions if something needs a tweak. Only when you approve (or the auto-release window passes) does money leave escrow.',
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
    q: 'Is my money safe if the creator disappears?',
    a: 'Yes. Your payment goes into escrow with noizu.direct — not directly to the creator. If they don\'t accept your order within 48 hours, or don\'t deliver on time, you\'re protected. If a formal dispute is raised, noizu.direct mediates. The creator can never release your funds on their own.',
  },
  {
    q: 'What\'s the difference between a single quote and a milestone quote?',
    a: 'A single quote is one deliverable for one price — good for smaller or faster jobs. A milestone quote breaks the work into 2–10 stages (e.g. sketch → lineart → colour → final), each with its own amount. You approve each stage as it\'s delivered, and that slice of the payment releases to the creator. Milestones give you more visibility on bigger jobs.',
  },
  {
    q: 'What is the "deposit %" I see on some quotes?',
    a: 'On single quotes, the deposit % is how much of the total the creator gets released early — 48 hours after they accept your order — so they can start work. The rest stays in escrow until 30 days after delivery, or sooner if you approve. You still pay the full amount up front either way. It\'s set by the creator per-quote.',
  },
  {
    q: 'Do I have to approve fast?',
    a: 'You get 14 days per delivered milestone (or 30 days on the final balance of a single quote) to review and approve or request a revision. If you don\'t respond in that window, the delivery is treated as approved and the payment releases automatically. So you\'re never forced to approve under pressure — and the creator is never left chasing you.',
  },
  {
    q: 'What if the work isn\'t what I asked for?',
    a: 'Every quote includes a set number of revisions. Request one, explain what needs to change, and the creator takes another pass. If you\'ve used all your revisions and it\'s still not right, you can open a dispute — noizu.direct reviews the brief, the deliveries, and the conversation, then decides. Keep the conversation on-platform so there\'s a record.',
  },
  {
    q: 'Can I cancel after I\'ve paid?',
    a: 'If the creator hasn\'t accepted within 48 hours of your payment, the order auto-cancels and you get a full refund. After they accept, cancellation depends on how much work has been done — message the creator first, and if you can\'t reach a resolution, open a dispute.',
  },
  {
    q: 'What fees am I paying?',
    a: 'A small processing fee (currently 2.5%) is added on top of the creator\'s quote when you pay. You\'ll see the exact breakdown — subtotal, fee, total — on the accept page before you pay. No hidden charges after that.',
  },
]

export default async function BuyerCommissionsHowItWorksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">How commissions work</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Commissions let you ask a creator for something custom — art, a design, a
          personalised piece of their craft. Here&apos;s how it works on noizu.direct, and
          how you stay protected the whole way through.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {steps.map((s) => (
          <StepCard key={s.step} step={s} />
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
            <Lock className="size-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-foreground">Your money is protected</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 list-none">
              <li>• Payment goes to <span className="text-foreground">noizu.direct escrow</span>, not directly to the creator.</li>
              <li>• The creator <span className="text-foreground">cannot release funds themselves</span> — only your approval (or the auto-release window) unlocks payment.</li>
              <li>• If the creator misses the 48-hour acceptance window, you get a <span className="text-foreground">full automatic refund</span>.</li>
              <li>• If something goes wrong, you can <Link href="/account/disputes" className="text-primary hover:underline">open a dispute</Link> and noizu.direct mediates.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex gap-3">
          <Clock className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Key timings</p>
            <ul className="mt-2 text-xs text-muted-foreground space-y-1 leading-relaxed">
              <li>• <span className="text-foreground">7 days</span> — you have to accept a quote</li>
              <li>• <span className="text-foreground">48 hours</span> — the creator has to accept your paid order</li>
              <li>• <span className="text-foreground">14 days</span> — your review window per delivered milestone</li>
              <li>• <span className="text-foreground">30 days</span> — final balance auto-release on single quotes</li>
            </ul>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex gap-3">
          <MessageSquare className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Keep it on-platform</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              All your requests, quotes, deliveries and messages live on noizu.direct. If
              something goes sideways, that record is what protects you — so avoid taking
              the conversation off-platform.
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
          <p className="font-semibold text-foreground">Ready to commission something?</p>
          <p className="text-sm text-muted-foreground mt-1">Browse creators and send your first request.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/account/commissions"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-border text-foreground hover:border-primary/40 transition-colors"
          >
            My commissions
          </Link>
          <Link
            href="/creators"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Browse creators
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
