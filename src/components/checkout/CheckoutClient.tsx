'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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
        // Sandbox credentials not configured — simulate success
        router.push(`/order/success?orderId=${orderId}`)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Payment failed'
      toast.error(msg)
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg bg-[#0d0d12] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:border-[#7c3aed] transition-colors'

  return (
    <div className="space-y-6">
      {/* Order summary card */}
      <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] overflow-hidden">
        <div className="p-5 border-b border-[#2a2a3a]">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#8888aa]">
            Order Summary
          </h2>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-[#f0f0f5] leading-snug">{productTitle}</p>
              <p className="mt-0.5 text-xs text-[#8888aa]">
                Qty: 1 &middot; {productType === 'PHYSICAL' ? 'Physical' : 'Digital Download'}
              </p>
            </div>
            <span className="shrink-0 font-semibold text-[#f0f0f5]">{formatPrice(amountUsd)}</span>
          </div>
        </div>

        {/* Fee breakdown */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8888aa]">Subtotal</span>
            <span className="text-[#f0f0f5]">{formatPrice(amountUsd)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8888aa]">Processing fee (2.5%)</span>
            <span className="text-[#f0f0f5]">{formatPrice(processingFee)}</span>
          </div>
          <div className="my-2 border-t border-[#2a2a3a]" />
          <div className="flex items-center justify-between font-bold">
            <span className="text-[#f0f0f5]">Total</span>
            <span className="text-xl text-[#7c3aed]">{formatPrice(total)}</span>
          </div>
        </div>

        <div className="px-5 pb-4">
          <p className="text-xs text-[#8888aa]">Payments processed in USD via Airwallex</p>
        </div>
      </div>

      {/* Shipping address form for physical products */}
      {productType === 'PHYSICAL' && (
        <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8888aa]">
            Shipping Address
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888aa]">Full Name</label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={shipping.name}
                onChange={(e) => updateShipping('name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888aa]">Address Line 1</label>
              <input
                type="text"
                placeholder="123 Main St"
                value={shipping.address}
                onChange={(e) => updateShipping('address', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#8888aa]">City</label>
                <input
                  type="text"
                  placeholder="New York"
                  value={shipping.city}
                  onChange={(e) => updateShipping('city', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#8888aa]">Postal Code</label>
                <input
                  type="text"
                  placeholder="10001"
                  value={shipping.postal}
                  onChange={(e) => updateShipping('postal', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888aa]">Country</label>
              <input
                type="text"
                placeholder="United States"
                value={shipping.country}
                onChange={(e) => updateShipping('country', e.target.value)}
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
          className="w-full rounded-xl bg-[#7c3aed] py-4 text-center font-semibold text-white text-lg hover:bg-[#6d28d9] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
            'Proceed to Payment'
          )}
        </button>

        <a
          href={`/product/${productId}`}
          className="block w-full rounded-xl border border-[#2a2a3a] py-3 text-center text-sm font-medium text-[#8888aa] hover:text-[#f0f0f5] hover:border-[#7c3aed]/30 transition-all"
        >
          Cancel — return to product
        </a>
      </div>
    </div>
  )
}
