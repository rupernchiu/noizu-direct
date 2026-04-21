'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'

/**
 * Unified modal for all four support payment flows.
 *
 *   gift         → one-time coffee (POST /api/support/payment-intent,  kind=GIFT)
 *   goal         → one-time goal contribution (POST /api/support/payment-intent, kind=GOAL)
 *   tier         → monthly membership (POST /api/support/subscription/create, kind=TIER)
 *   monthly_gift → recurring coffee (POST /api/support/subscription/create, kind=MONTHLY_GIFT)
 *
 * Flow: pre-filled stage → click Pay → backend creates intent + saves PENDING
 * row → Airwallex DropIn mounts inline → on success, toast + close + refresh.
 * Counters (subscriberCount, giftCount, goal totals) are bumped by the webhook,
 * so router.refresh() picks up the authoritative numbers on next paint.
 */

type SupportMode = 'gift' | 'goal' | 'tier' | 'monthly_gift'

const CURRENCIES = [
  { code: 'USD', symbol: '$',   flag: '🇺🇸' },
  { code: 'MYR', symbol: 'RM',  flag: '🇲🇾' },
  { code: 'SGD', symbol: 'S$',  flag: '🇸🇬' },
  { code: 'PHP', symbol: '₱',   flag: '🇵🇭' },
  { code: 'THB', symbol: '฿',   flag: '🇹🇭' },
  { code: 'IDR', symbol: 'Rp',  flag: '🇮🇩' },
] as const

type CurrencyCode = typeof CURRENCIES[number]['code']
const ZERO_DECIMAL = new Set<CurrencyCode>(['IDR'])

function formatDisplay(cents: number, currency: CurrencyCode): string {
  const info = CURRENCIES.find(c => c.code === currency)!
  if (ZERO_DECIMAL.has(currency)) {
    return `${info.symbol} ${Math.round(cents).toLocaleString('en', { maximumFractionDigits: 0 })}`
  }
  return `${info.symbol}${(cents / 100).toFixed(2)}`
}

export interface SupportModalProps {
  open: boolean
  onClose: () => void
  mode: SupportMode
  creatorUsername: string
  creatorDisplayName: string
  /** Preset amounts in USD cents (gift mode only) */
  presetAmounts?: number[]
  /** tier mode only */
  tier?: { id: string; name: string; priceUsd: number; description: string | null; perks: string[] }
  /** goal mode only */
  goal?: { id: string; title: string; targetAmountUsd: number; currentAmountUsd: number }
  /** Initial amount in cents (optional, gift/goal/monthly_gift) */
  initialAmountUsd?: number | null
  /** Initial message (gift/goal) */
  initialMessage?: string
  /** Initial anon flag (gift/goal) */
  initialAnonymous?: boolean
}

export function SupportModal(props: SupportModalProps) {
  const {
    open, onClose, mode, creatorUsername, creatorDisplayName,
    presetAmounts, tier, goal, initialAmountUsd, initialMessage, initialAnonymous,
  } = props

  const router  = useRouter()
  const dropinContainerRef = useRef<HTMLDivElement>(null)

  // Stage: 'form' → user confirms amount/message → 'pay' → DropIn mounted
  const [stage, setStage]   = useState<'form' | 'pay' | 'success'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Form state
  const [amountCents, setAmountCents] = useState<number | null>(initialAmountUsd ?? null)
  const [customInput, setCustomInput] = useState('')
  const [message, setMessage]         = useState(initialMessage ?? '')
  const [anonymous, setAnonymous]     = useState(initialAnonymous ?? false)
  const [currency, setCurrency]       = useState<CurrencyCode>('USD')

  // Payment intent from backend
  const [awPayment, setAwPayment] = useState<{
    intentId: string
    clientSecret: string
    currency: string
    displayAmount: number
  } | null>(null)

  // Reset when opened/closed
  useEffect(() => {
    if (!open) return
    setStage('form')
    setError(null)
    setSubmitting(false)
    setAwPayment(null)
    setAmountCents(initialAmountUsd ?? (tier ? tier.priceUsd : null))
    setCustomInput('')
    setMessage(initialMessage ?? '')
    setAnonymous(initialAnonymous ?? false)
    setCurrency('USD')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Resolve effective amount in cents
  function resolveAmount(): number | null {
    if (mode === 'tier') return tier?.priceUsd ?? null
    if (customInput.trim()) {
      const n = Number(customInput)
      if (!Number.isFinite(n) || n <= 0) return null
      return Math.round(n * 100)
    }
    return amountCents
  }

  const effectiveAmount = resolveAmount()
  const isRecurring = mode === 'tier' || mode === 'monthly_gift'

  // Mount Airwallex DropIn once we have an intent
  useEffect(() => {
    if (!awPayment || stage !== 'pay') return
    let dropIn: any = null

    async function mount() {
      const { init, createElement } = await import('@airwallex/components-sdk')
      await init({
        env: (process.env.NEXT_PUBLIC_AIRWALLEX_ENV ?? 'demo') as 'demo' | 'prod',
        origin: window.location.origin,
      })
      if (!dropinContainerRef.current) throw new Error('Payment container not found')
      dropIn = await createElement('dropIn' as any, {
        intent_id: awPayment!.intentId,
        client_secret: awPayment!.clientSecret,
        currency: awPayment!.currency,
      })
      dropIn.mount(dropinContainerRef.current)
      dropIn.on('success', () => {
        setStage('success')
        // Toast + refresh. Webhook has already flipped status server-side.
        toast.success(isRecurring
          ? `You're now supporting ${creatorDisplayName} monthly 💜`
          : `Thank you for supporting ${creatorDisplayName}! 💜`
        )
        // Give webhook ~1s to persist, then refresh to pick up bumped counters
        setTimeout(() => {
          router.refresh()
          onClose()
        }, 1200)
      })
      dropIn.on('error', (e: any) => {
        setError(e?.detail?.error?.message ?? 'Payment failed. Please try again.')
      })
    }

    mount().catch(err => setError((err as Error).message))

    return () => {
      if (dropIn) { try { dropIn.unmount() } catch {} }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awPayment, stage])

  async function handleStartPayment() {
    setError(null)

    const amt = resolveAmount()
    if (mode !== 'tier') {
      if (!amt || amt < 100) {
        setError('Minimum is $1')
        return
      }
      if (!isRecurring && amt > 50000) {
        setError('Maximum per one-time gift is $500')
        return
      }
    }

    setSubmitting(true)
    try {
      let res: Response
      if (isRecurring) {
        res = await fetch('/api/support/subscription/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorUsername,
            kind: mode === 'tier' ? 'TIER' : 'MONTHLY_GIFT',
            tierId: mode === 'tier' ? tier?.id : undefined,
            amountUsd: mode === 'monthly_gift' ? amt : undefined,
            currency,
          }),
        })
      } else {
        res = await fetch('/api/support/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorUsername,
            kind: mode === 'gift' ? 'GIFT' : 'GOAL',
            goalId: mode === 'goal' ? goal?.id : undefined,
            amountUsd: amt,
            message: message.trim() || undefined,
            isAnonymous: anonymous,
            currency,
          }),
        })
      }

      const data = await res.json() as {
        intentId?: string
        clientSecret?: string
        currency?: string
        displayAmount?: number
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? 'Failed to start payment')

      setAwPayment({
        intentId: data.intentId!,
        clientSecret: data.clientSecret!,
        currency: data.currency ?? currency,
        displayAmount: data.displayAmount ?? amt ?? 0,
      })
      setStage('pay')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  // Title & subtitle per mode
  let title = ''
  let subtitle = ''
  if (mode === 'tier') {
    title = `Subscribe: ${tier?.name ?? 'Tier'}`
    subtitle = `$${((tier?.priceUsd ?? 0) / 100).toFixed(0)}/month · Cancel anytime`
  } else if (mode === 'goal') {
    title = `Contribute to: ${goal?.title ?? 'Goal'}`
    subtitle = 'Your support helps fund this project'
  } else if (mode === 'monthly_gift') {
    title = `Support ${creatorDisplayName} monthly`
    subtitle = 'Recurring monthly · Cancel anytime'
  } else {
    title = `Buy ${creatorDisplayName} a coffee`
    subtitle = 'One-time gift'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-surface transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="mb-5 pr-8">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {stage === 'form' && (
          <div className="space-y-4">
            {/* Tier perks summary */}
            {mode === 'tier' && tier && (
              <div className="rounded-xl border border-border bg-surface p-4">
                {tier.description && (
                  <p className="mb-2 text-sm text-muted-foreground">{tier.description}</p>
                )}
                <ul className="space-y-1.5">
                  {tier.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0 fill-primary" aria-hidden="true">
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                      </svg>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Goal progress summary */}
            {mode === 'goal' && goal && (
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">
                    ${(goal.currentAmountUsd / 100).toFixed(0)} raised
                  </span>
                  <span className="text-muted-foreground">
                    of ${(goal.targetAmountUsd / 100).toFixed(0)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.round((goal.currentAmountUsd / goal.targetAmountUsd) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Amount selection — gift / goal / monthly_gift */}
            {mode !== 'tier' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Amount</label>
                {presetAmounts && presetAmounts.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {presetAmounts.map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setAmountCents(amt * 100); setCustomInput('') }}
                        className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                        style={
                          amountCents === amt * 100 && !customInput
                            ? { border: '1.5px solid #7c3aed', color: '#7c3aed', background: 'rgba(124,58,237,0.08)' }
                            : { border: '1.5px solid var(--border)', color: 'var(--foreground)', background: 'transparent' }
                        }
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Custom amount"
                    value={customInput}
                    onChange={e => { setCustomInput(e.target.value); setAmountCents(null) }}
                    className="w-full rounded-xl border border-border bg-surface pl-7 pr-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Message — gift / goal only */}
            {(mode === 'gift' || mode === 'goal') && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Message <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="Leave a message for the creator"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            )}

            {/* Anon — gift / goal only */}
            {(mode === 'gift' || mode === 'goal') && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={e => setAnonymous(e.target.checked)}
                  className="size-4 rounded accent-primary"
                />
                Send anonymously
              </label>
            )}

            {/* Currency */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Pay in</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as CurrencyCode)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag}  {c.code}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="button"
              onClick={handleStartPayment}
              disabled={submitting || (mode !== 'tier' && !effectiveAmount)}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Preparing…'
                : isRecurring ? `Continue to payment · $${((effectiveAmount ?? 0) / 100).toFixed(0)}/mo`
                : `Continue · $${((effectiveAmount ?? 0) / 100).toFixed(0)}`}
            </button>

            {isRecurring && (
              <p className="text-center text-xs text-muted-foreground">
                You&apos;ll be charged monthly. Cancel anytime from your account.
              </p>
            )}
          </div>
        )}

        {stage === 'pay' && awPayment && (
          <div>
            <div className="mb-3 rounded-xl bg-surface px-4 py-3 text-sm">
              <span className="text-muted-foreground">Charging </span>
              <span className="font-semibold text-foreground">
                {formatDisplay(awPayment.displayAmount, awPayment.currency as CurrencyCode)}
              </span>
              {isRecurring && <span className="text-muted-foreground"> / month</span>}
            </div>
            <div ref={dropinContainerRef} className="min-h-[300px]" />
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          </div>
        )}

        {stage === 'success' && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
              💜
            </div>
            <h4 className="mb-1 text-base font-bold text-foreground">Thank you!</h4>
            <p className="text-sm text-muted-foreground">Your support means the world.</p>
          </div>
        )}
      </div>
    </div>
  )
}
