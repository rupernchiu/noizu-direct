'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { CATEGORY_LABELS, TYPE_LABELS } from '@/lib/labels'

type Creator = {
  username: string
  displayName: string
  avatar: string | null
  isVerified: boolean
}

type Product = {
  id: string
  title: string
  price: number
  images: string
  type: string
  category: string | null
  stock: number | null
  isActive: boolean
  creator: Creator
}

type WishlistItem = {
  id: string
  productId: string
  notifyPriceChange: boolean
  notifyRestock: boolean
  notifyNewDrop: boolean
  addedAt: Date | string
  product: Product
}

type Props = {
  items: WishlistItem[]
  ownedProductIds: string[]
}

const typeStyles: Record<string, string> = {
  DIGITAL: 'bg-blue-500/20 text-blue-400',
  PHYSICAL: 'bg-green-500/20 text-green-400',
  POD: 'bg-purple-500/20 text-purple-400',
}

export function WishlistClient({ items: initialItems, ownedProductIds }: Props) {
  const [items, setItems] = useState<WishlistItem[]>(initialItems)
  const [removing, setRemoving] = useState<Set<string>>(new Set())

  async function handleRemove(productId: string) {
    setRemoving(prev => new Set(prev).add(productId))
    setItems(prev => prev.filter(item => item.productId !== productId))

    try {
      await fetch(`/api/wishlist/${productId}`, { method: 'DELETE' })
    } catch {
      // Silent fail — item already removed from UI
    } finally {
      setRemoving(prev => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground">
          <Heart className="size-8" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">Your wishlist is empty</h3>
        <p className="mb-6 text-sm text-muted-foreground max-w-sm mx-auto">
          Save products you love to come back to later.
        </p>
        <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
          Browse Marketplace
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map(item => {
        const { product } = item
        let thumbnailUrl: string | null = null
        try {
          const imgs = JSON.parse(product.images)
          thumbnailUrl = Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null
        } catch {
          thumbnailUrl = null
        }

        const isOwned = ownedProductIds.includes(product.id)
        const isOutOfStock = product.stock === 0 && product.type !== 'DIGITAL'
        const isRemoving = removing.has(product.id)

        return (
          <div
            key={item.id}
            className="bg-surface rounded-xl border border-border overflow-hidden flex flex-col"
          >
            {/* Image container */}
            <div className="relative" style={{ height: '160px' }}>
              {thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailUrl}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-background flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}

              {/* Out of stock overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-t-xl">
                  <span className="text-white text-sm font-semibold">Out of Stock</span>
                </div>
              )}

              {/* Remove (heart) button */}
              <button
                suppressHydrationWarning
                onClick={() => handleRemove(product.id)}
                disabled={isRemoving}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors disabled:opacity-50"
                aria-label="Remove from wishlist"
              >
                <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>

              {/* Type badge */}
              <div className="absolute top-2 left-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    typeStyles[product.type] ?? 'bg-muted/20 text-muted-foreground'
                  }`}
                >
                  {TYPE_LABELS[product.type] ?? product.type}
                </span>
              </div>
            </div>

            {/* Card body */}
            <div className="p-4 flex flex-col flex-1 gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
                  {product.title}
                </h3>
                {isOwned && (
                  <span className="bg-success/20 text-success text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-success/30 flex-shrink-0">
                    Owned
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {product.creator.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.creator.avatar}
                    alt={product.creator.displayName}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-primary/20 flex-shrink-0" />
                )}
                <span className="text-xs text-muted-foreground truncate">
                  {product.creator.displayName}
                  {product.creator.isVerified && (
                    <span className="ml-1 text-primary">✓</span>
                  )}
                </span>
              </div>

              <p className="text-primary font-bold text-sm">
                ${(product.price / 100).toFixed(2)}
              </p>

              <div className="mt-auto pt-2 flex flex-col gap-2">
                <Link
                  href={`/product/${product.id}`}
                  className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 text-sm font-medium text-center"
                >
                  Buy Now
                </Link>
                <Link
                  href={`/account/tickets/new?creator=${product.creator.username}`}
                  className="bg-background hover:bg-border border border-border text-foreground rounded-lg px-4 py-2 text-sm font-medium text-center"
                >
                  Open Ticket
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
