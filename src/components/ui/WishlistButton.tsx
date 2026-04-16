'use client'
import { Heart } from 'lucide-react'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
  productId: string
  initialInWishlist?: boolean
  variant?: 'icon' | 'button'
  className?: string
}

export function WishlistButton({ productId, initialInWishlist = false, variant = 'icon', className }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [inWishlist, setInWishlist] = useState(initialInWishlist)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!session) { router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`); return }
    setLoading(true)
    const optimistic = !inWishlist
    setInWishlist(optimistic)
    try {
      if (optimistic) {
        await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) })
      } else {
        await fetch(`/api/wishlist/${productId}`, { method: 'DELETE' })
      }
    } catch {
      setInWishlist(!optimistic)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'button') {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        className={cn('flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors', inWishlist ? 'border-destructive/50 text-destructive bg-destructive/5' : 'border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive', className)}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
        <span className="text-sm font-medium">{inWishlist ? 'Saved' : 'Save'}</span>
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn('flex items-center justify-center w-11 h-11 rounded-xl border border-border bg-card hover:border-destructive/50 hover:text-destructive transition-colors', inWishlist && 'border-destructive/50 text-destructive bg-destructive/5', className)}
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart size={18} fill={inWishlist ? 'currentColor' : 'none'} />
    </button>
  )
}
