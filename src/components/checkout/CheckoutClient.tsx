'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'

interface ShippingAddress {
  name: string
  address: string
  city: string
  country: string
  postal: string
}

interface Props {
  orderId: string
  productTitle: string
  productType: string
  amountUsd: number
  processingFee: number
  total: number
  productId: string
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function CheckoutClient({
  orderId,
  productTitle,
  productType,
  amountUsd,
  processingFee,
  total,
  productId,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [shipping, setShipping] = useState<ShippingAddress>({
    name: '',
    address: '',
    city: '',
    country: '',
    postal: '',
  })

  function updateShipping(field: keyof ShippingAddress, value: string) {
    setShipping((prev) => ({ ...prev, [field]: value }))
  }

  async function handlePay() {
    if (productType === 'PHYSICAL') {
      if (!shipping.name || !shipping.address || !shipping.city || !shipping.country || !shipping.postal) {
        toast.error('Please fill in all shipping fields')
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          currency: 'USD',
          shippingAddress: productType === 'PHYSICAL' ? shipping : undefined,
        }),
      })
      const data = await res.json() as { intentId: string | null; hppUrl: string | null; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Payment failed')
      if (data.hppUrl) {
        window.location.href = data.hppUrl
      } else {
        throw new Error('Payment gateway is not configured. Please contact support.')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Payment failed'
      toast.error(msg)
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors'

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">1</span>
          <span className="text-foreground font-medium">Review</span>
        </div>
        <div className="flex-1 h-px bg-border max-w-8" />
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-border text-muted-foreground flex items-center justify-center font-bold text-xs">2</span>
          <span className="text-muted-foreground">Payment</span>
        </div>
        <div className="flex-1 h-px bg-border max-w-8" />
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-border text-muted-foreground flex items-center justify-center font-bold text-xs">3</span>
          <span className="text-muted-foreground">Done</span>
        </div>
      </div>

      {/* Order summary card */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Order Summary
          </h2>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-foreground leading-snug">{productTitle}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Qty: 1 &middot; {productType === 'PHYSICAL' ? 'Physical' : 'Digital Download'}
              </p>
            </div>
            <span className="shrink-0 font-semibold text-foreground">{formatPrice(amountUsd)}</span>
          </div>
        </div>

        {/* Fee breakdown */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{formatPrice(amountUsd)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Processing fee (2.5%)</span>
            <span className="text-foreground">{formatPrice(processingFee)}</span>
          </div>
          <div className="my-2 border-t border-border" />
          <div className="flex items-center justify-between font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-xl text-primary">{formatPrice(total)}</span>
          </div>
        </div>

        <div className="px-5 pb-4">
          <p className="text-xs text-muted-foreground">Payments processed in USD via Airwallex</p>
        </div>
      </div>

      {/* Buyer protection */}
      <div className="rounded-xl bg-success/5 border border-success/20 p-4 flex items-center gap-3">
        <Shield size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
        <div>
          <p className="text-sm font-semibold text-foreground">noizu.direct Member Protection</p>
          <p className="text-xs text-muted-foreground">Your payment is held securely until you receive your order.</p>
        </div>
      </div>

      {/* Shipping address form for physical products */}
      {productType === 'PHYSICAL' && (
        <div className="rounded-xl bg-card border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Shipping Address
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={shipping.name}
                onChange={(e) => updateShipping('name', e.target.value)}
                autoComplete="name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Address Line 1</label>
              <input
                type="text"
                placeholder="123 Main St"
                value={shipping.address}
                onChange={(e) => updateShipping('address', e.target.value)}
                autoComplete="street-address"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">City</label>
                <input
                  type="text"
                  placeholder="New York"
                  value={shipping.city}
                  onChange={(e) => updateShipping('city', e.target.value)}
                  autoComplete="address-level2"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Postal Code</label>
                <input
                  type="text"
                  placeholder="10001"
                  value={shipping.postal}
                  onChange={(e) => updateShipping('postal', e.target.value)}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Country</label>
              <input
                type="text"
                placeholder="United States"
                value={shipping.country}
                onChange={(e) => updateShipping('country', e.target.value)}
                autoComplete="country-name"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full rounded-xl bg-primary py-4 text-center font-semibold text-white text-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </span>
          ) : (
            'Continue to Payment →'
          )}
        </button>

        <a
          href={`/product/${productId}`}
          className="block w-full rounded-xl border border-border py-3 text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
        >
          Cancel — return to product
        </a>
      </div>
    </div>
  )
}
