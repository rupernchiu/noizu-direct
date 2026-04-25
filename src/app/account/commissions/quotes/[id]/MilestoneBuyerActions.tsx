'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MilestoneBuyerActionsProps {
  milestoneId: string
  revisionsRemaining: number
  /** ISO timestamp of when escrow auto-releases to creator if buyer takes no action. */
  autoReleaseAt?: string | null
}

export function MilestoneBuyerActions({ milestoneId, revisionsRemaining, autoReleaseAt }: MilestoneBuyerActionsProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'approving' | 'revising'>('idle')
  const [showRevision, setShowRevision] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onApprove() {
    if (!confirm('Approve this milestone and release payment?')) return
    setMode('approving'); setError(null)
    const res = await fetch(`/api/commissions/milestones/${milestoneId}/approve`, { method: 'POST' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to approve')
      setMode('idle')
      return
    }
    router.refresh()
  }

  async function onRevision() {
    if (note.length < 10) { setError('Revision note must be at least 10 characters'); return }
    setMode('revising'); setError(null)
    const res = await fetch(`/api/commissions/milestones/${milestoneId}/revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to request revision')
      setMode('idle')
      return
    }
    router.refresh()
  }

  // Surface the 14-day auto-release timer that escrow-processor enforces — buyer
  // would otherwise miss the deadline silently and have funds release before
  // they reviewed the deliverable.
  const autoReleaseMs = autoReleaseAt ? new Date(autoReleaseAt).getTime() - Date.now() : null
  const autoReleaseDays = autoReleaseMs !== null ? Math.ceil(autoReleaseMs / (24 * 60 * 60 * 1000)) : null
  const autoReleaseStyle =
    autoReleaseDays === null ? '' :
    autoReleaseDays <= 1 ? 'text-red-500' :
    autoReleaseDays <= 3 ? 'text-amber-600' :
    'text-muted-foreground'

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      {autoReleaseDays !== null && autoReleaseDays > 0 && (
        <p className={`text-xs ${autoReleaseStyle}`}>
          ⏱ Funds auto-release to creator in {autoReleaseDays} day{autoReleaseDays === 1 ? '' : 's'} unless you approve or request a revision.
        </p>
      )}
      {autoReleaseDays !== null && autoReleaseDays <= 0 && (
        <p className="text-xs text-muted-foreground">
          Auto-release window closed — funds may release at any moment.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={onApprove} disabled={mode !== 'idle'} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
          {mode === 'approving' ? 'Approving…' : 'Approve & release payment'}
        </button>
        {revisionsRemaining > 0 && (
          <button onClick={() => setShowRevision(v => !v)} disabled={mode !== 'idle'} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground">
            Request revision ({revisionsRemaining} left)
          </button>
        )}
      </div>
      {showRevision && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={2000}
            placeholder="What needs to change? (min 10 chars)"
            className="w-full text-sm p-2 rounded-lg bg-card border border-border text-foreground"
            rows={3}
          />
          <button onClick={onRevision} disabled={mode === 'revising'} className="text-xs px-3 py-1.5 rounded-lg border border-border disabled:opacity-50">
            {mode === 'revising' ? 'Submitting…' : 'Submit revision request'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
