'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ReviewVisibilityToggle({ id, isVisible }: { id: string; isVisible: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !isVisible }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={[
        'px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50',
        isVisible
          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
      ].join(' ')}
    >
      {loading ? '…' : isVisible ? 'Hide' : 'Show'}
    </button>
  )
}
