'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CATEGORY_LABELS, TYPE_LABELS } from '@/lib/labels'

interface ProductCardProps {
  product: {
    id: string
    title: string
    description: string
    price: number
    category: string
    type: string
    images: string // JSON string array
    creator: {
      username: string
      displayName: string
      avatar: string | null
      isVerified: boolean
      isTopCreator: boolean
    }
  }
  initialInWishlist?: boolean
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function getFirstImage(images: string): string | null {
  try {
    const parsed = JSON.parse(images)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0] as string
    }
  } catch {
    // ignore
  }
  return null
}

const CATEGORY_COLORS: Record<string, string> = {
  DIGITAL_ART: 'bg-secondary text-background',
  DOUJIN: 'bg-primary text-white',
  COSPLAY_PRINT: 'bg-warning text-background',
  PHYSICAL_MERCH: 'bg-success text-background',
  STICKERS: 'bg-destructive text-white',
  // legacy / fallbacks
  PRINT: 'bg-secondary text-background',
  DIGITAL: 'bg-secondary text-background',
  COMMISSION: 'bg-destructive text-white',
}

export function ProductCard({ product, initialInWishlist }: ProductCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [inWishlist, setInWishlist] = useState(initialInWishlist ?? false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!session) { router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`); return }
    setWishlistLoading(true)
    const optimistic = !inWishlist
    setInWishlist(optimistic)
    try {
      if (optimistic) {
        await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id }) })
      } else {
        await fetch(`/api/wishlist/${product.id}`, { method: 'DELETE' })
      }
    } catch {
      setInWishlist(!optimistic) // revert on error
    } finally {
      setWishlistLoading(false)
    }
  }

  const firstImage = getFirstImage(product.images)

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block focus:outline-none"
    >
      <div
        className={cn(
          'relative flex flex-col bg-card rounded-xl overflow-hidden border border-border',
          'transition-all duration-200',
          'hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:border-primary/40',
          'focus-within:scale-[1.02] focus-within:shadow-[0_0_20px_rgba(124,58,237,0.3)]'
        )}
      >
        {/* Image area */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface">
          {firstImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firstImage}
              alt={`${product.title} by ${product.creator?.displayName || 'creator'}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const fallback = target.nextElementSibling as HTMLElement | null
                if (fallback) fallback.style.display = 'block'
              }}
            />
          ) : null}
          <div
            className="h-full w-full bg-gradient-to-br from-primary/30 to-secondary/30"
            style={{ display: firstImage ? 'none' : 'block' }}
          />

          {/* Category badge — top left */}
          <span
            className={cn(
              'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold leading-tight',
              CATEGORY_COLORS[product.category] ?? 'bg-secondary text-background'
            )}
          >
            {CATEGORY_LABELS[product.category] ?? product.category}
          </span>

          {/* Type badge — top right */}
          <span className="absolute right-2 top-2 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
            {TYPE_LABELS[product.type] ?? product.type}
          </span>

          {/* Wishlist heart */}
          <button
            suppressHydrationWarning
            type="button"
            onClick={toggleWishlist}
            disabled={wishlistLoading}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            style={{
              position: 'absolute', top: '8px', right: '8px',
              width: '44px', height: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              border: 'none', borderRadius: '50%',
              cursor: 'pointer', backdropFilter: 'blur(4px)',
              transition: 'transform 0.15s',
              zIndex: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Heart
              size={15}
              fill={inWishlist ? '#ef4444' : 'transparent'}
              color={inWishlist ? '#ef4444' : '#fff'}
            />
          </button>

          {/* Buy Now overlay on hover (hidden on mobile — always shown) */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-primary to-primary/80 py-2 text-center text-sm font-semibold text-white transition-transform duration-200 group-hover:translate-y-0 sm:block hidden">
            Buy Now
          </div>
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {product.title}
          </h3>

          {/* Creator row */}
          <div className="flex items-center gap-1.5">
            {product.creator.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.creator.avatar}
                alt={`${product.creator?.displayName || 'creator'} profile photo`}
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-5 items-center justify-center rounded-full bg-primary/30 text-[10px] font-bold text-primary">
                {product.creator.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate text-xs text-muted-foreground">
              {product.creator.displayName}
            </span>
            {product.creator.isVerified && (
              <svg
                className="size-3.5 shrink-0 text-secondary"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-label="Verified"
              >
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
              </svg>
            )}
          </div>

          {/* Price + mobile buy button */}
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-base font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            {/* Mobile-only buy button (always visible) */}
            <button suppressHydrationWarning className="sm:hidden rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white">
              Buy
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
