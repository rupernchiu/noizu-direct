'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function GrantBonusForm({ userId, currentBonusMb }: { userId: string; currentBonusMb: number }) {
  const router = useRouter()
  const [value, setValue] = useState(String(currentBonusMb))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const mb = parseInt(value || '0')
    if (isNaN(mb) || mb < 0) { setError('Must be ≥ 0'); return }
    setBusy(true); setError(null)
    const res = await fetch('/api/admin/storage/grant-bonus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, bonusMb: mb }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed')
      setBusy(false)
      return
    }
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => setValue(e.target.value)}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? 'grant-bonus-error' : undefined}
        className="w-20 text-xs p-1.5 rounded-lg bg-background border border-border text-foreground"
      />
      <span className="text-xs text-muted-foreground">MB</span>
      <button
        onClick={save}
        disabled={busy || value === String(currentBonusMb)}
        className="text-xs px-2 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
      >
        {busy ? '…' : 'Save'}
      </button>
      {error && <span id="grant-bonus-error" role="alert" className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
