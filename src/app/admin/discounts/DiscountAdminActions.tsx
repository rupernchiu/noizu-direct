'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

interface Props {
  id: string
  code: string
  isActive: boolean
  hasRedemptions: boolean
}

export function DiscountAdminActions({ id, code, isActive, hasRedemptions }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggleActive() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to update')
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    const verb = hasRedemptions ? 'Deactivate' : 'Delete'
    if (!confirm(`${verb} code "${code}"? ${hasRedemptions ? 'It has been redeemed; it will be deactivated rather than deleted.' : 'This cannot be undone.'}`)) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to remove')
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggleActive}
        disabled={busy}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
          isActive
            ? 'bg-green-500/20 text-green-400 hover:bg-yellow-500/20 hover:text-yellow-400'
            : 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'
        }`}
      >
        {isActive ? 'Active' : 'Inactive'}
      </button>
      <button
        onClick={remove}
        disabled={busy}
        aria-label="Remove"
        className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
