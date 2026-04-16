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
          className="w-28 rounded-md bg-background border border-border px-2 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={() => updateOrder({ status: 'SHIPPED', trackingNumber: tracking })}
          disabled={loading || !tracking.trim()}
          className="text-xs px-2 py-1 rounded-md bg-primary hover:bg-primary/90 text-white disabled:opacity-50 transition-colors"
        >
          Ship
        </button>
      </div>
    )
  }

  return <span className="text-xs text-muted-foreground">—</span>
}
