'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, ShoppingCart, Plus, Minus, Trash2, Package } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export function CartDrawer() {
  const { isOpen, closeCart, groups, subtotal, processingFee, total, itemCount, removeItem, updateQuantity, isLoading } = useCartStore()
  const pathname = usePathname()

  // Safety net: always close drawer on route change so a stray backdrop can't
  // linger over the new page.
  useEffect(() => { closeCart() }, [pathname, closeCart])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeCart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeCart])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[420px] bg-background border-l border-border flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 0.2s ease-out' }}
        role="dialog"
        aria-label="Shopping Cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-foreground" />
            <h2 className="text-lg font-bold text-foreground">Shopping Cart</h2>
            {itemCount > 0 && (
              <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <button
            suppressHydrationWarning
            onClick={closeCart}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-border transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4 py-16">
              <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
                <ShoppingCart size={28} className="text-muted-foreground opacity-50" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">Your cart is empty</p>
                <p className="text-sm text-muted-foreground mt-1">Browse products from SEA creators</p>
              </div>
              <Link
                href="/marketplace"
                onClick={closeCart}
                className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-6">
              {groups.map((group, gi) => (
                <div key={group.creatorId}>
                  {gi > 0 && <div className="h-px bg-border mb-6" />}

                  {/* Creator header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {group.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={group.avatar} alt={group.displayName} className="w-7 h-7 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white">
                          {group.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <Link
                        href={`/creator/${group.username}`}
                        onClick={closeCart}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {group.displayName}
                      </Link>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    {group.items.map((item) => {
                      const images = (() => { try { return JSON.parse(item.product.images as unknown as string) as string[] } catch { return [] } })()
                      const thumb = images[0] ?? null
                      const isDigital = item.product.type === 'DIGITAL'
                      const isPOD = item.product.type === 'POD'
                      const lockQty = isDigital || isPOD

                      return (
                        <div
                          key={item.id}
                          className={`flex gap-3 rounded-xl bg-card border p-3 ${item.unavailable ? 'border-destructive/50 opacity-60' : 'border-border'}`}
                        >
                          {/* Thumbnail */}
                          <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-border/30 flex items-center justify-center">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt={item.product.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={20} className="text-muted-foreground/40" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{item.product.title}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                isDigital ? 'bg-secondary/15 text-secondary' :
                                isPOD ? 'bg-primary/15 text-primary' :
                                'bg-amber-500/15 text-amber-400'
                              }`}>
                                {isDigital ? 'Digital' : isPOD ? 'POD' : 'Physical'}
                              </span>
                              {item.selectedSize && <span className="text-[10px] text-muted-foreground">Size: {item.selectedSize}</span>}
                              {item.selectedColor && <span className="text-[10px] text-muted-foreground">Color: {item.selectedColor}</span>}
                            </div>
                            {item.unavailable && (
                              <p className="text-[10px] text-destructive mt-1 font-medium">No longer available</p>
                            )}
                            {isDigital && <p className="text-[10px] text-muted-foreground mt-0.5">Instant download</p>}

                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-bold text-foreground">{formatPrice(item.product.price * item.quantity)}</span>
                              <div className="flex items-center gap-1">
                                {!lockQty && (
                                  <>
                                    <button
                                      suppressHydrationWarning
                                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                      disabled={item.quantity <= 1}
                                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 transition-colors"
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <span className="w-7 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                                    <button
                                      suppressHydrationWarning
                                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                      disabled={item.product.type === 'PHYSICAL' && item.product.stock !== null && item.quantity >= item.product.stock}
                                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 transition-colors"
                                    >
                                      <Plus size={12} />
                                    </button>
                                  </>
                                )}
                                {lockQty && (
                                  <span className="text-xs text-muted-foreground">Qty: 1</span>
                                )}
                                <button
                                  suppressHydrationWarning
                                  onClick={() => removeItem(item.id)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors ml-1"
                                  aria-label="Remove item"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Creator subtotal */}
                  <div className="mt-3 flex justify-end">
                    <span className="text-xs text-muted-foreground">
                      Creator subtotal: <span className="font-semibold text-foreground">{formatPrice(group.subtotal)}</span>
                    </span>
                  </div>
                </div>
              ))}

              {/* Multi-creator notice */}
              {groups.length > 1 && (
                <p className="text-[11px] text-muted-foreground text-center px-2">
                  Items from {groups.length} creators checked out together. Each order fulfilled and tracked separately.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {groups.length > 0 && (
          <div className="shrink-0 border-t border-border bg-background px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Processing fee (2.5%)</span>
              <span className="text-foreground">{formatPrice(processingFee)}</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-foreground text-base">Total</span>
              <span className="text-xl text-primary">{formatPrice(total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full text-center rounded-xl bg-primary py-4 text-base font-bold text-white hover:bg-primary/90 transition-colors"
            >
              Proceed to Checkout
            </Link>
            <button
              suppressHydrationWarning
              onClick={closeCart}
              className="block w-full text-center rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
