'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  balanceCents: number
  currentStatus: string
}

const REASONS = [
  { value: 'disagreeing_terms', label: 'Disagreeing with updated terms' },
  { value: 'no_longer_selling', label: 'No longer selling' },
  { value: 'moving_platform', label: 'Moving to another platform' },
  { value: 'other', label: 'Other' },
]

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date)
}

export function CloseAccountClient({ balanceCents, currentStatus: _currentStatus }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [reason, setReason] = useState<string>('')
  const [otherText, setOtherText] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closureDate, setClosureDate] = useState<string | null>(null)

  const effectiveReason = reason === 'other' ? otherText.trim() : reason

  const closureScheduledDate = addDays(new Date(), 30)

  const handleConfirm = async () => {
    if (confirmText !== 'CLOSE MY ACCOUNT') return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/creator/close-account', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: effectiveReason }),
      })
      const data = await res.json().catch(() => ({})) as any
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit. Please try again.')
      setClosureDate(data.closureDate ?? closureScheduledDate.toISOString())
    } catch (err: any) {
      setError(err.message ?? 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  // Success screen
  if (closureDate) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h1 className="text-xl font-bold text-foreground">Account Closure Scheduled</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your account closure has been scheduled for{' '}
          <strong className="text-foreground">{formatDateLong(new Date(closureDate))}</strong>.
          You can cancel by contacting{' '}
          <a href="mailto:hello@noizu.direct" className="text-primary hover:underline">
            hello@noizu.direct
          </a>{' '}
          within 24 hours.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={[
                'size-7 rounded-full flex items-center justify-center text-xs font-semibold',
                step >= s
                  ? 'bg-primary text-white'
                  : 'bg-border text-muted-foreground',
              ].join(' ')}
            >
              {s}
            </div>
            {i < 2 && <div className={`h-px w-8 ${step > s ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">
          {step === 1 ? 'Reason' : step === 2 ? 'Balance Review' : 'Confirm'}
        </span>
      </div>

      {/* ── Step 1: Reason ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <h1 className="text-xl font-bold text-foreground">Close Your Account</h1>

          {/* Warning card */}
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-2">
              <span className="text-lg shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-400">
                  This action will begin the account closure process.
                </p>
                <p className="mt-1 text-xs text-red-400/80 leading-relaxed">
                  This cannot be undone after 24 hours. Please read each step carefully.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Reason for closing:</p>
            {REASONS.map(r => (
              <label key={r.value} className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="size-4 accent-primary shrink-0"
                />
                <span className="text-sm text-foreground">{r.label}</span>
              </label>
            ))}

            {reason === 'other' && (
              <textarea
                value={otherText}
                onChange={e => setOtherText(e.target.value)}
                placeholder="Please describe your reason…"
                rows={3}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            )}
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground text-center hover:border-primary/40 transition-colors"
            >
              ← Cancel
            </Link>
            <button
              type="button"
              disabled={!reason || (reason === 'other' && !otherText.trim())}
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Balance Review ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <h1 className="text-xl font-bold text-foreground">Review Your Balance</h1>

          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estimated balance</span>
              <span className="text-xl font-bold text-foreground">{formatUsd(balanceCents)}</span>
            </div>
            <div className="h-px bg-border" />
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0">•</span>
                Your balance of <strong className="text-foreground">{formatUsd(balanceCents)}</strong> will be paid out within 30 days after account closure.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0">•</span>
                Any active disputes must be resolved before final payout.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 shrink-0">•</span>
                Your listings will be deactivated immediately.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0">•</span>
                You will have 30 days to fulfill existing orders.
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Confirm ────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <h1 className="text-xl font-bold text-foreground">Confirm Account Closure</h1>

          <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>
              Your account will be closed on{' '}
              <strong className="text-foreground">{formatDateLong(closureScheduledDate)}</strong>.
              Until then you can still fulfill existing orders and withdraw your balance, but cannot create new listings.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Type <span className="font-mono text-red-400">CLOSE MY ACCOUNT</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="CLOSE MY ACCOUNT"
              autoComplete="off"
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm bg-surface text-foreground placeholder:text-muted-foreground/40 font-mono',
                'focus:outline-none focus:ring-2 focus:ring-red-500/40',
                confirmText.length > 0 && confirmText !== 'CLOSE MY ACCOUNT'
                  ? 'border-red-500/50'
                  : 'border-border',
              ].join(' ')}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={confirmText !== 'CLOSE MY ACCOUNT' || submitting}
              onClick={handleConfirm}
              className={[
                'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
                confirmText === 'CLOSE MY ACCOUNT' && !submitting
                  ? 'bg-red-600 hover:bg-red-500 cursor-pointer'
                  : 'bg-red-600/30 cursor-not-allowed',
              ].join(' ')}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing…
                </span>
              ) : (
                'Confirm Account Closure'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
