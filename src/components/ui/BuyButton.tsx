'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  productId: string
  className?: string
}

export function BuyButton({ productId, className }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleBuy() {
    if (!session) { router.push('/login'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as { orderId: string }
      router.push(`/checkout/${data.orderId}`)
    } catch {
      // show error - for now just reset
      setLoading(false)
    }
  }

  return (
    <button
      suppressHydrationWarning
      onClick={handleBuy}
      disabled={loading}
      className={cn('w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-60 text-lg', className)}
    >
      {loading ? 'Processing...' : 'Buy Now'}
    </button>
  )
}
