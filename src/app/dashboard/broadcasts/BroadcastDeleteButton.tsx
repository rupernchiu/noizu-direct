'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function BroadcastDeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete() {
    setError(null)
    const res = await fetch(`/api/creator/broadcasts/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? 'Delete failed')
      setConfirming(false)
      return
    }
    startTransition(() => router.refresh())
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground">Delete everywhere?</span>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="rounded-md bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? 'Deleting…' : 'Yes'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-md border border-border px-2 py-1 text-foreground hover:bg-background"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-red-600"
        aria-label="Delete broadcast"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
