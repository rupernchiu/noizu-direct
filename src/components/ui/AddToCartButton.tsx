'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShoppingCart, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'

interface ColorVariant { name: string; mockupImage: string }

interface Props {
  productId: string
  productType: string
  stock: number | null
  sizeVariants?: string[]
  colorVariants?: ColorVariant[]
  className?: string
}

export function AddToCartButton({ productId, productType, stock, sizeVariants = [], colorVariants = [], className }: Props) {
  const router = useRouter()
  const { addItem, openCart } = useCartStore()
  const [qty, setQty] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const isDigital = productType === 'DIGITAL'
  const isPOD = productType === 'POD'
  const isPhysical = productType === 'PHYSICAL'
  const outOfStock = isPhysical && stock !== null && stock < 1
  const maxQty = isPhysical && stock !== null ? stock : 99

  const needsSize = isPOD && sizeVariants.length > 0 && !selectedSize
  const needsColor = isPOD && colorVariants.length > 0 && !selectedColor
  const readyToAdd = !needsSize && !needsColor

  async function handleAdd(buyNow = false) {
    if (!readyToAdd || outOfStock) return
    setLoading(true)
    const result = await addItem(
      productId,
      isDigital || isPOD ? 1 : qty,
      selectedSize || undefined,
      selectedColor || undefined
    )
    setLoading(false)
    if (result.alreadyInCart) {
      toast.info('Already in your cart', {
        action: { label: 'View Cart', onClick: () => openCart() }
      })
      if (buyNow) router.push('/checkout')
      return
    }
    if (!result.ok) {
      toast.error(result.error ?? 'Could not add to cart')
      return
    }
    if (buyNow) {
      router.push('/checkout')
    } else {
      toast.success('Added to cart!', {
        action: { label: 'View Cart', onClick: () => openCart() },
        duration: 2000
      })
      openCart()
    }
  }

  if (outOfStock) {
    return (
      <button disabled className={cn('w-full py-3 bg-border text-muted-foreground font-semibold rounded-xl cursor-not-allowed text-sm', className)}>
        Out of Stock
      </button>
    )
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* POD selectors */}
      {isPOD && sizeVariants.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizeVariants.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSize(s)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  selectedSize === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {isPOD && colorVariants.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {colorVariants.map(c => (
              <button
                key={c.name}
                onClick={() => setSelectedColor(c.name)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  selectedColor === c.name
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity for physical */}
      {isPhysical && stock !== null && stock > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Qty:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center text-sm font-semibold text-foreground">{qty}</span>
            <button
              onClick={() => setQty(q => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleAdd(false)}
          disabled={loading || !readyToAdd}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          <ShoppingCart size={16} />
          {loading ? 'Adding...' : needsSize || needsColor ? 'Select Options' : 'Add to Cart'}
        </button>
        <button
          onClick={() => handleAdd(true)}
          disabled={loading || !readyToAdd}
          className="flex-1 py-3 border border-primary text-primary hover:bg-primary/10 font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          Buy Now
        </button>
      </div>
    </div>
  )
}
