'use client'

import { useState } from 'react'

interface AgreementToSign {
  id: string
  type: string
  version: string
  title: string
  content: string
  summary: string
  changeLog: string | null
  effectiveDate: string
  publishedAt: string | null
}

interface Props {
  agreements: AgreementToSign[]
  userLegalName: string
  gracePeriodEnd: string | null
  daysRemaining: number | null
  skipCount: number
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso))
}

const MAX_SKIPS = 3

export function AgreementWall({ agreements, userLegalName, gracePeriodEnd, daysRemaining, skipCount: initialSkipCount }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [signatureName, setSignatureName] = useState('')
  const [checkedRead, setCheckedRead] = useState(false)
  const [checkedAgree, setCheckedAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [skipCount, setSkipCount] = useState(initialSkipCount)
  const [skipping, setSkipping] = useState(false)

  // Detect new creators: all agreements have no changeLog (never signed any before)
  const isNewCreator = agreements.every(a => !a.changeLog)

  async function handleSkip() {
    setSkipping(true)
    try {
      const res = await fetch('/api/agreements/skip', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setSkipCount(data.skipCount)
        setSkipped(true)
      }
    } catch { /* best effort */ }
    setSkipping(false)
  }

  if (skipped) return null

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const nameMatches =
    signatureName.trim().toLowerCase() === userLegalName.trim().toLowerCase() &&
    signatureName.trim().length > 0

  const canSubmit = checkedRead && checkedAgree && nameMatches && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/agreements/sign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatures: agreements.map(a => ({
            templateId: a.id,
            signedName: signatureName.trim(),
          })),
          agreedToAll: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as any).error ?? 'Failed to submit. Please try again.')
      }
      window.location.reload()
    } catch (err: any) {
      setError(err.message ?? 'An unexpected error occurred.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-2xl mx-auto my-4 sm:my-8 p-4 sm:p-8 bg-surface border border-border rounded-2xl">

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp"
            alt="noizu.direct"
            className="h-8 dark:hidden mb-4"
          />
          <img
            src="/uploads/library/e17af218-b641-4ded-918e-a190d438eb3d.webp"
            alt="noizu.direct"
            className="h-8 hidden dark:block mb-4"
          />
          <h1 className="text-xl font-bold text-foreground text-center">
            {isNewCreator
              ? 'Welcome — Please Sign Your Agreements'
              : 'Agreement Update Required'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            The following agreements require your signature:
          </p>
        </div>

        {/* Grace period banner */}
        {daysRemaining !== null && (
          daysRemaining > 7 ? (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
              <span className="shrink-0">⚠️</span>
              <span>Please sign the updated agreements to continue using your dashboard.</span>
            </div>
          ) : daysRemaining > 0 ? (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 animate-pulse">
              <span className="shrink-0">⚠️</span>
              <span>
                <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</strong> to sign.
                {gracePeriodEnd && (
                  <> Your account will be restricted on {formatDate(gracePeriodEnd)} if not signed.</>
                )}
              </span>
            </div>
          ) : (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
              <span className="shrink-0">📋</span>
              <span>Your attention is needed — please review and sign the agreements below to keep your account in good standing.</span>
            </div>
          )
        )}

        {/* Agreement cards */}
        <div className="space-y-3 mb-6">
          {agreements.map(a => {
            const expanded = expandedIds.has(a.id)
            return (
              <div
                key={a.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0">📋</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Version {a.version} &mdash; Effective {formatDate(a.effectiveDate)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {a.summary}
                    </p>
                    {a.changeLog && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-foreground">What&apos;s new:</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                          {a.changeLog}
                        </p>
                      </div>
                    )}
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={() => toggleExpand(a.id)}
                      className="mt-3 text-xs font-medium text-primary hover:underline focus:outline-none"
                    >
                      {expanded ? 'Hide Full Agreement ↑' : 'Read Full Agreement ↓'}
                    </button>
                    {expanded && (
                      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface p-3">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                          {a.content}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Signature section */}
        <div className="rounded-xl border border-border bg-background p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            By signing below, you confirm you have read and agree to all agreements listed above.
          </p>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Type your full legal name to confirm:
            </label>
            <input
              suppressHydrationWarning
              type="text"
              value={signatureName}
              onChange={e => setSignatureName(e.target.value)}
              placeholder={userLegalName || 'Your full legal name'}
              autoComplete="off"
              className={[
                'w-full rounded-lg border px-3 py-2 text-base sm:text-sm bg-surface text-foreground placeholder:text-muted-foreground/60',
                'focus:outline-none focus:ring-2 focus:ring-primary/40',
                signatureName.length > 0 && !nameMatches
                  ? 'border-red-500/50'
                  : 'border-border',
              ].join(' ')}
            />
            {signatureName.length > 0 && !nameMatches && (
              <p className="mt-1 text-xs text-red-400">
                Name must match your legal name on file: &ldquo;{userLegalName}&rdquo;
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              suppressHydrationWarning
              type="checkbox"
              checked={checkedRead}
              onChange={e => setCheckedRead(e.target.checked)}
              className="mt-0.5 size-4 accent-primary shrink-0"
            />
            <span className="text-sm text-foreground">
              I have read all updated agreements above
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              suppressHydrationWarning
              type="checkbox"
              checked={checkedAgree}
              onChange={e => setCheckedAgree(e.target.checked)}
              className="mt-0.5 size-4 accent-primary shrink-0"
            />
            <span className="text-sm text-foreground">
              I agree to be bound by these new terms
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            suppressHydrationWarning
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={[
              'w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors',
              canSubmit
                ? 'bg-primary text-white hover:bg-primary/90 cursor-pointer'
                : 'bg-primary/30 text-white/50 cursor-not-allowed',
            ].join(' ')}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Submitting…
              </span>
            ) : (
              'I Agree — Continue to Dashboard'
            )}
          </button>
        </div>

        {/* Skip / support section */}
        <div className="mt-5 flex flex-col items-center gap-2">
          {skipCount >= MAX_SKIPS ? (
            <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-center w-full">
              You have used all {MAX_SKIPS} skips. Please{' '}
              <a href="mailto:hello@noizu.direct" className="underline font-medium">
                contact support
              </a>{' '}
              to proceed.
            </p>
          ) : (
            <button
              suppressHydrationWarning
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {skipping ? 'Saving…' : `Skip for later (${skipCount}/${MAX_SKIPS})`}
            </button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t agree with the new terms?{' '}
            <a href="/dashboard/close-account" className="text-primary hover:underline">
              Request account closure instead →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
