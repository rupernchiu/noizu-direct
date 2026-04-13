'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ApprovePayoutButton({ payoutId }: { payoutId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function approve() {
    if (!confirm('Approve this payout?')) return
    setLoading(true)
    try {
      await fetch(`/api/admin/payouts/${payoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={approve}
      disabled={loading}
      className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
    >
      {loading ? 'Approving...' : 'Approve'}
    </button>
  )
}
