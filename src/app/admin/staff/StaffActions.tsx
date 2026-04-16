'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function StaffActions({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      await fetch(`/api/admin/staff/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      suppressHydrationWarning
      onClick={toggle}
      disabled={loading}
      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
        isActive
          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
          : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
      }`}
    >
      {loading ? '…' : isActive ? 'Deactivate' : 'Activate'}
    </button>
  )
}
