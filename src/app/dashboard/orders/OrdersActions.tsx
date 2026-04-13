'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OrdersActionsProps {
  orderId: string
  status: string
  productType: string
}

export function OrdersActions({ orderId, status, productType }: OrdersActionsProps) {
  const router = useRouter()
  const [tracking, setTracking] = useState('')
  const [loading, setLoading] = useState(false)

  async function updateOrder(body: Record<string, unknown>) {
    setLoading(true)
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (status === 'PENDING') {
    return (
      <button
        onClick={() => updateOrder({ status: 'CANCELLED' })}
        disabled={loading}
        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
      >
        Cancel
      </button>
    )
  }

  if (status === 'PAID' && productType === 'PHYSICAL') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Tracking #"
          className="w-28 rounded-md bg-[#0d0d12] border border-[#2a2a3a] px-2 py-1 text-xs text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
        />
        <button
          onClick={() => updateOrder({ status: 'SHIPPED', trackingNumber: tracking })}
          disabled={loading || !tracking.trim()}
          className="text-xs px-2 py-1 rounded-md bg-[#7c3aed] hover:bg-[#6d28d9] text-white disabled:opacity-50 transition-colors"
        >
          Ship
        </button>
      </div>
    )
  }

  return <span className="text-xs text-[#8888aa]">—</span>
}
