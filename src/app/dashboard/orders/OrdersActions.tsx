'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface OrdersActionsProps {
  orderId: string
  status: string
  productType: string
}

export function OrdersActions({ orderId, status, productType }: OrdersActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (productType === 'COMMISSION') {
    return (
      <Link
        href={`/dashboard/orders/${orderId}`}
        className="text-xs text-primary hover:text-primary/80 transition-colors"
      >
        View
      </Link>
    )
  }

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

  if (status === 'PAID' && (productType === 'PHYSICAL' || productType === 'POD')) {
    return (
      <Link
        href={`/dashboard/orders/${orderId}`}
        className="text-xs px-2 py-1 rounded-md bg-primary hover:bg-primary/90 text-white transition-colors"
      >
        Add tracking
      </Link>
    )
  }

  return (
    <Link
      href={`/dashboard/orders/${orderId}`}
      className="text-xs text-primary hover:text-primary/80 transition-colors"
    >
      View
    </Link>
  )
}
