'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  creatorProfileId: string
  creatorUsername: string
}

const MIN_BRIEF = 30
const MAX_BRIEF = 4000
const MAX_TITLE = 140

export function RequestCommissionForm({ creatorProfileId, creatorUsername }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [briefText, setBriefText] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [deadline, setDeadline] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const briefLen = briefText.length
  const canSubmit = useMemo(() => {
    if (!title.trim() || title.length > MAX_TITLE) return false
    if (briefLen < MIN_BRIEF || briefLen > MAX_BRIEF) return false
    const min = budgetMin ? parseFloat(budgetMin) : null
    const max = budgetMax ? parseFloat(budgetMax) : null
    if (min != null && max != null && min > max) return false
    return true
  }, [title, briefLen, budgetMin, budgetMax])

  async function submit() {
    setBusy(true); setError(null)
    const min = budgetMin ? Math.round(parseFloat(budgetMin) * 100) : undefined
    const max = budgetMax ? Math.round(parseFloat(budgetMax) * 100) : undefined
    const payload = {
      creatorProfileId,
      title: title.trim(),
      briefText: briefText.trim(),
      budgetMinUsd: min,
      budgetMaxUsd: max,
      deadlineAt: deadline ? new Date(deadline).toISOString() : undefined,
    }
    const res = await fetch('/api/commissions/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to submit request')
      setBusy(false)
      return
    }
    const data = await res.json() as { requestId: string }
    router.push(`/account/commissions/requests/${data.requestId}`)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={MAX_TITLE}
          placeholder="e.g. Full-body illustration of my OC"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'commission-request-error' : undefined}
          className="w-full text-sm p-3 rounded-lg bg-card border border-border text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">{title.length}/{MAX_TITLE}</p>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Brief <span className="text-red-400">*</span>
        </label>
        <textarea
          value={briefText}
          onChange={e => setBriefText(e.target.value)}
          rows={8}
          maxLength={MAX_BRIEF}
          placeholder="Describe what you want — character, style, pose, background, usage, reference links. The more detail, the better the quote."
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'commission-request-error' : undefined}
          className="w-full text-sm p-3 rounded-lg bg-card border border-border text-foreground resize-none"
        />
        <p className={`text-xs mt-1 ${briefLen < MIN_BRIEF ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
          {briefLen < MIN_BRIEF
            ? `${MIN_BRIEF - briefLen} more character${MIN_BRIEF - briefLen === 1 ? '' : 's'} needed`
            : `${briefLen}/${MAX_BRIEF}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Budget min ($ USD)</label>
          <input
            type="number" step="1" min="0"
            value={budgetMin}
            onChange={e => setBudgetMin(e.target.value)}
            placeholder="Optional"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'commission-request-error' : undefined}
            className="w-full text-sm p-3 rounded-lg bg-card border border-border text-foreground"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Budget max ($ USD)</label>
          <input
            type="number" step="1" min="0"
            value={budgetMax}
            onChange={e => setBudgetMax(e.target.value)}
            placeholder="Optional"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'commission-request-error' : undefined}
            className="w-full text-sm p-3 rounded-lg bg-card border border-border text-foreground"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Preferred deadline</label>
        <input
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'commission-request-error' : undefined}
          className="w-full text-sm p-3 rounded-lg bg-card border border-border text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">Optional — the creator will confirm turnaround in their quote.</p>
      </div>

      <div className="bg-muted/20 border border-border rounded-lg p-3 text-xs text-muted-foreground">
        The creator has up to 7 days to respond with a quote. You&apos;ll pay only once you accept the quote.
      </div>

      {error && <p id="commission-request-error" role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          onClick={submit}
          disabled={!canSubmit || busy}
          className="text-sm px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Sending…' : 'Send request'}
        </button>
        <button
          onClick={() => router.push(`/creator/${creatorUsername}`)}
          disabled={busy}
          className="text-sm px-5 py-2.5 rounded-lg border border-border text-foreground hover:border-foreground disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
