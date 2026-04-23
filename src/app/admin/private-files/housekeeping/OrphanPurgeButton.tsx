'use client'

import { useState, useTransition } from 'react'
import { purgeOrphanDraftAction } from './actions'

interface Props {
  applicationId: string
  userEmail: string
}

export function OrphanPurgeButton({ applicationId, userEmail }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function run() {
    setError('')
    startTransition(async () => {
      const res = await purgeOrphanDraftAction(applicationId)
      if (!res.ok) setError(res.error ?? 'Purge failed')
      else setConfirming(false)
    })
  }

  if (!confirming) {
    return (
      <button
        onClick={() => { setConfirming(true); setError('') }}
        className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
      >
        Purge draft
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <p className="text-xs text-foreground">
        Purge all KYC files + draft for <span className="font-mono">{userEmail}</span>?
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={run}
          disabled={pending}
          className="px-2 py-0.5 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-500/90 transition-colors disabled:opacity-50"
        >
          {pending ? 'Purging…' : 'Confirm purge'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
