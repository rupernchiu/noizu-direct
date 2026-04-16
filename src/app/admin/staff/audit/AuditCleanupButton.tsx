'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function AuditCleanupButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState('')

  async function run() {
    setRunning(true)
    setConfirming(false)
    setResult('')
    try {
      const res = await fetch('/api/cron/audit-cleanup', { method: 'POST' })
      const data = await res.json().catch(() => ({})) as { deleted?: number; message?: string; error?: string }
      if (!res.ok) { setResult(data.error ?? 'Cleanup failed'); return }
      setResult(`${data.deleted ?? 0} records deleted.`)
      router.refresh()
    } catch {
      setResult('Network error')
    } finally {
      setRunning(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive max-w-xs">
          Delete all audit events older than 2 years. This cannot be undone.
        </span>
        <button
          onClick={run}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive text-white hover:bg-destructive/90 transition-colors"
        >
          Confirm Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className={`text-xs font-medium ${result.includes('error') || result.includes('failed') ? 'text-destructive' : 'text-green-400'}`}>
          {result}
        </span>
      )}
      <button
        onClick={() => setConfirming(true)}
        disabled={running}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
      >
        <Trash2 size={12} />
        {running ? 'Running…' : 'Run Cleanup'}
      </button>
    </div>
  )
}
