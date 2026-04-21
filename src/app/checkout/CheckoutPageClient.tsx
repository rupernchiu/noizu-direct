'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Shield, CheckCircle2, Package, X, ShoppingCart, Minus, Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const CURRENCIES = [
  { code: 'USD', label: 'USD – US Dollar',           symbol: '$',   flag: '🇺🇸' },
  { code: 'MYR', label: 'MYR – Malaysian Ringgit',   symbol: 'RM',  flag: '🇲🇾' },
  { code: 'SGD', label: 'SGD – Singapore Dollar',    symbol: 'S$',  flag: '🇸🇬' },
  { code: 'PHP', label: 'PHP – Philippine Peso',      symbol: '₱',   flag: '🇵🇭' },
  { code: 'THB', label: 'THB – Thai Baht',            symbol: '฿',   flag: '🇹🇭' },
  { code: 'IDR', label: 'IDR – Indonesian Rupiah',    symbol: 'Rp',  flag: '🇮🇩' },
] as const

type CurrencyCode = typeof CURRENCIES[number]['code']

// IDR has no decimal sub-units — display as whole number
const ZERO_DECIMAL = new Set(['IDR'])

function detectCurrencyFromLocale(): CurrencyCode {
  if (typeof navigator === 'undefined') return 'USD'
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('ms') || lang.includes('-my')) return 'MYR'
  if (lang.includes('-sg') || lang === 'zh-sg') return 'SGD'
  if (lang.startsWith('fil') || lang.includes('-ph')) return 'PHP'
  if (lang.startsWith('th')) return 'THB'
  if (lang.startsWith('id')) return 'IDR'
  return 'USD'
}

function formatDisplay(amount: number, currency: CurrencyCode): string {
  const info = CURRENCIES.find(c => c.code === currency)!
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100
  const value = amount / factor
  if (ZERO_DECIMAL.has(currency)) {
    return `${info.symbol} ${value.toLocaleString('en', { maximumFractionDigits: 0 })}`
  }
  return `${info.symbol}${value.toFixed(2)}`
}

function formatPrice(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

interface CartItemInfo {
  id: string
  quantity: number
  selectedSize: string | null
  selectedColor: string | null
  product: {
    id: string
    title: string
    price: number
    type: string
    images: string | string[]
    stock?: number | null
    creator: {
      id: string
      displayName: string
      username: string
      avatar: string | null
      userId: string
    }
  }
  priceChanged?: boolean
  oldPrice?: number
}

interface GroupInfo {
  creator: {
    id: string
    displayName: string
    username: string
    avatar: string | null
    userId: string
  }
  items: CartItemInfo[]
  subtotal: number
}

interface Props {
  groups: GroupInfo[]
  subtotal: number
  processingFee: number
  total: number
  hasPhysical: boolean
  feeRate: number
}

interface ShippingAddress {
  fullName: string
  line1: string
  line2: string
  city: string
  state: string
  postal: string
  country: string
  phone: string
}

interface ConfirmedOrder {
  id: string
  creatorName: string
  productType: string
  items: Array<{ title: string; quantity: number }>
}

const SEA_COUNTRIES = [
  'Malaysia', 'Singapore', 'Philippines', 'Indonesia', 'Thailand',
  'Vietnam', 'Myanmar', 'Cambodia', 'Laos', 'Brunei',
]

const OTHER_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia', 'Bosnia and Herzegovina',
  'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic',
  'Denmark', 'Ecuador', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Hungary', 'Iceland', 'India', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait',
  'Latvia', 'Lebanon', 'Libya', 'Lithuania', 'Luxembourg', 'Maldives', 'Mexico', 'Moldova',
  'Mongolia', 'Morocco', 'Mozambique', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'North Korea',
  'Norway', 'Oman', 'Pakistan', 'Palestine', 'Paraguay', 'Peru', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Senegal', 'Serbia', 'Slovakia', 'Slovenia',
  'Somalia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tanzania', 'Tunisia', 'Turkey', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Yemen', 'Zimbabwe',
]

const inputClass =
  'w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function parseFirstImage(images: string | string[]): string | null {
  const arr = typeof images === 'string'
    ? (() => { try { return JSON.parse(images) } catch { return [] } })()
    : images
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null
}

function recalcGroups(groups: GroupInfo[]): GroupInfo[] {
  return groups.map(g => ({
    ...g,
    subtotal: g.items.reduce((s, i) => s + i.product.price * i.quantity, 0),
  }))
}

function applyItemRemoval(groups: GroupInfo[], cartItemId: string): GroupInfo[] {
  return recalcGroups(
    groups
      .map(g => ({ ...g, items: g.items.filter(i => i.id !== cartItemId) }))
      .filter(g => g.items.length > 0)
  )
}

function applyQtyChange(groups: GroupInfo[], cartItemId: string, newQty: number): GroupInfo[] {
  return recalcGroups(
    groups.map(g => ({
      ...g,
      items: g.items.map(i => i.id === cartItemId ? { ...i, quantity: newQty } : i),
    }))
  )
}

export function CheckoutPageClient({ groups: initialGroups, hasPhysical: initialHasPhysical, feeRate }: Props) {
  const router = useRouter()
  const dropinContainerRef = useRef<HTMLDivElement>(null)
  const [liveGroups, setLiveGroups] = useState<GroupInfo[]>(initialGroups)
  const [loading, setLoading] = useState(false)
  const [confirmedOrders, setConfirmedOrders] = useState<ConfirmedOrder[] | null>(null)
  const [shipping, setShipping] = useState<ShippingAddress>({
    fullName: '', line1: '', line2: '', city: '', state: '', postal: '', country: '', phone: '',
  })
  const [awPayment, setAwPayment] = useState<{ intentId: string; clientSecret: string; currency: string } | null>(null)
  const [dropinReady, setDropinReady] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD')
  const [displayRate, setDisplayRate] = useState<number | null>(null)
  const [displayTotal, setDisplayTotal] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  interface CreatorDiscountState {
    code: string
    applying: boolean
    applied: { discountCodeId: string; discountAmount: number; message: string } | null
    error: string | null
  }
  const [creatorDiscounts, setCreatorDiscounts] = useState<Record<string, CreatorDiscountState>>({})
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Derived totals — recalculated from live state
  const liveSubtotal      = liveGroups.reduce((s, g) => s + g.subtotal, 0)
  // Sum discounts only for creators still in cart
  const liveDiscount      = liveGroups.reduce((total, g) => {
    const d = creatorDiscounts[g.creator.id]
    return total + (d?.applied ? d.applied.discountAmount : 0)
  }, 0)
  const liveDiscounted    = Math.max(0, liveSubtotal - liveDiscount)
  const liveProcessingFee = Math.round(liveDiscounted * feeRate)
  const liveTotal         = liveDiscounted + liveProcessingFee
  const liveTotalItems   = liveGroups.reduce((n, g) => n + g.items.length, 0)
  const liveHasPhysical  = liveGroups.some(g =>
    g.items.some(i => i.product.type === 'PHYSICAL' || i.product.type === 'POD')
  )

  // Auto-detect currency from browser locale on mount
  useEffect(() => {
    setSelectedCurrency(detectCurrencyFromLocale())
  }, [])

  // Fetch live FX rate whenever currency or total changes
  useEffect(() => {
    if (selectedCurrency === 'USD') {
      setDisplayRate(null)
      setDisplayTotal(null)
      return
    }
    if (liveTotal === 0) return
    setRateLoading(true)
    fetch(`/api/airwallex/fx-rate?to=${selectedCurrency}&amountUsd=${liveTotal}`)
      .then(r => r.json())
      .then((d: { rate?: number; displayAmount?: number }) => {
        if (d.rate && d.displayAmount) {
          setDisplayRate(d.rate)
          setDisplayTotal(d.displayAmount)
        }
      })
      .catch(() => {})
      .finally(() => setRateLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, liveTotal])

  // Price freshness check on mount
  useEffect(() => {
    fetch('/api/cart')
      .then(r => r.json())
      .then((data: { groups?: Array<{ items?: Array<{ id: string; product?: { price: number } }> }> }) => {
        if (!data.groups) return
        const serverPrices = new Map<string, number>()
        for (const g of data.groups) {
          for (const item of (g.items ?? [])) {
            if (item.id && item.product?.price !== undefined) {
              serverPrices.set(item.id, item.product.price)
            }
          }
        }
        setLiveGroups(prev => prev.map(g => ({
          ...g,
          items: g.items.map(i => {
            const serverPrice = serverPrices.get(i.id)
            if (serverPrice !== undefined && serverPrice !== i.product.price) {
              return { ...i, priceChanged: true, oldPrice: i.product.price, product: { ...i.product, price: serverPrice } }
            }
            return i
          }),
          subtotal: g.items.reduce((s, i) => {
            const p = serverPrices.get(i.id) ?? i.product.price
            return s + p * i.quantity
          }, 0),
        })))
      })
      .catch(() => { /* non-critical */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeItem = useCallback((cartItemId: string, productTitle: string) => {
    const snapshot = liveGroups
    setLiveGroups(applyItemRemoval(liveGroups, cartItemId))

    const timer = setTimeout(() => {
      pendingDeletes.current.delete(cartItemId)
      fetch(`/api/cart/${cartItemId}`, { method: 'DELETE' }).catch(() => {})
    }, 5000)
    pendingDeletes.current.set(cartItemId, timer)

    toast(`${productTitle} removed.`, {
      action: {
        label: 'Undo',
        onClick: () => {
          const t = pendingDeletes.current.get(cartItemId)
          if (t) { clearTimeout(t); pendingDeletes.current.delete(cartItemId) }
          setLiveGroups(snapshot)
        },
      },
      duration: 5000,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveGroups])

  function updateQuantity(cartItemId: string, newQty: number, item: CartItemInfo) {
    if (newQty <= 0) {
      removeItem(cartItemId, item.product.title)
      return
    }
    setLiveGroups(applyQtyChange(liveGroups, cartItemId, newQty))
    fetch(`/api/cart/${cartItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty }),
    }).catch(() => {})
  }

  function setCreatorDiscount(creatorId: string, patch: Partial<CreatorDiscountState>) {
    setCreatorDiscounts(prev => {
      const existing: CreatorDiscountState = prev[creatorId] ?? { code: '', applying: false, applied: null, error: null }
      return { ...prev, [creatorId]: { ...existing, ...patch } }
    })
  }

  async function applyDiscountForCreator(creatorId: string) {
    const codeInput = creatorDiscounts[creatorId]?.code?.trim()
    if (!codeInput) return
    setCreatorDiscount(creatorId, { applying: true, error: null })
    try {
      const cartGroups = liveGroups.map(g => ({
        creatorId: g.creator.id,
        productIds: g.items.map(i => i.product.id),
        subtotal: g.subtotal,
      }))
      const res = await fetch('/api/checkout/apply-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput, cartGroups }),
      })
      const data = await res.json() as { discountCodeId?: string; discountAmount?: number; message?: string; error?: string }
      if (!res.ok) {
        setCreatorDiscount(creatorId, { error: data.error ?? 'Invalid code' })
        return
      }
      setCreatorDiscount(creatorId, {
        applied: { discountCodeId: data.discountCodeId!, discountAmount: data.discountAmount!, message: data.message! },
        error: null,
      })
    } catch {
      setCreatorDiscount(creatorId, { error: 'Failed to apply code' })
    } finally {
      setCreatorDiscount(creatorId, { applying: false })
    }
  }

  function updateShipping(field: keyof ShippingAddress, value: string) {
    setShipping(prev => ({ ...prev, [field]: value }))
  }

  function validateShipping(): boolean {
    if (!shipping.fullName.trim())  { toast.error('Full name is required'); return false }
    if (!shipping.line1.trim())     { toast.error('Address line 1 is required'); return false }
    if (!shipping.city.trim())      { toast.error('City is required'); return false }
    if (!shipping.state.trim())     { toast.error('State / region is required'); return false }
    if (!shipping.postal.trim())    { toast.error('Postal code is required'); return false }
    if (!shipping.country)          { toast.error('Country is required'); return false }
    return true
  }

  useEffect(() => {
    if (!awPayment) return
    let dropIn: any = null
    setDropinReady(false)

    async function mountDropin() {
      const { init, createElement } = await import('@airwallex/components-sdk')
      await init({
        env: (process.env.NEXT_PUBLIC_AIRWALLEX_ENV ?? 'demo') as 'demo' | 'prod',
        origin: window.location.origin,
      })
      if (!dropinContainerRef.current) throw new Error('Payment container not found')
      dropIn = await createElement('dropIn' as any, {
        intent_id: awPayment!.intentId,
        client_secret: awPayment!.clientSecret,
        currency: awPayment!.currency,
      })
      dropIn.mount(dropinContainerRef.current)
      setDropinReady(true)
      dropIn.on('success', () => router.push('/orders?success=1'))
      dropIn.on('error', (e: any) => {
        setPaymentError(e?.detail?.error?.message ?? 'Payment failed. Please try again.')
      })
    }

    mountDropin().catch(err => {
      setDropinReady(true)
      setPaymentError((err as Error).message)
    })

    return () => {
      if (dropIn) { try { dropIn.unmount() } catch {} }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awPayment])

  async function handleConfirmPay() {
    for (const [id, timer] of pendingDeletes.current) {
      clearTimeout(timer)
      pendingDeletes.current.delete(id)
      await fetch(`/api/cart/${id}`, { method: 'DELETE' }).catch(() => {})
    }

    if (liveHasPhysical && !validateShipping()) return
    setLoading(true)
    try {
      const cartSessionId = `cart_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const res = await fetch('/api/airwallex/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: cartSessionId,
          currency: selectedCurrency,
          shippingAddress: liveHasPhysical ? shipping : undefined,
          discounts: liveGroups
            .filter(g => creatorDiscounts[g.creator.id]?.applied)
            .map(g => ({ discountCodeId: creatorDiscounts[g.creator.id].applied!.discountCodeId })),
        }),
      })
      const data = await res.json() as { intentId?: string; clientSecret?: string; currency?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to create payment intent')
      setAwPayment({ intentId: data.intentId!, clientSecret: data.clientSecret!, currency: data.currency ?? selectedCurrency })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ── Confirmation screen ────────────────────────────────────────────────────
  if (confirmedOrders !== null) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">You&apos;re all set!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your orders have been placed and are being processed.</p>
          </div>
          <div className="space-y-4 mb-8">
            {confirmedOrders.map(order => (
              <div key={order.id} className="rounded-xl bg-card border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                  <span className="font-semibold text-foreground text-sm">Order #{order.id.slice(-8).toUpperCase()}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">From {order.creatorName}</p>
                <ul className="space-y-1 mb-3">
                  {order.items.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {item.title} &times; {item.quantity}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg bg-background border border-border px-3 py-2 text-xs text-muted-foreground">
                  {order.productType === 'DIGITAL'
                    ? '📥 Check your downloads — your files are ready.'
                    : '📦 Creator will ship within 7 days · Payment protected by escrow'}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/account/orders')}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all text-base"
            >
              View All Orders
            </button>
            <button
              onClick={() => router.push('/marketplace')}
              className="w-full py-3.5 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 font-medium rounded-xl transition-all text-base"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Empty cart state ───────────────────────────────────────────────────────
  if (liveGroups.length === 0) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card border border-border mb-5">
              <ShoppingCart size={28} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Your cart is empty</h2>
            <p className="text-sm text-muted-foreground mb-8">Add products to your cart to checkout.</p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 1: Review & Edit Order ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-8 pb-24 md:pb-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Review Your Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {liveTotalItems} item{liveTotalItems !== 1 ? 's' : ''} from {liveGroups.length} creator{liveGroups.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Left column: cart groups + shipping ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {liveGroups.map(group => {
              const initials = getInitials(group.creator.displayName)
              return (
                <div key={group.creator.id} className="rounded-xl bg-card border border-border overflow-hidden">
                  {/* Creator header */}
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-surface">
                    {group.creator.avatar ? (
                      <Image
                        src={group.creator.avatar}
                        alt={group.creator.displayName}
                        width={28}
                        height={28}
                        className="rounded-full object-cover border border-border flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    <p className="font-semibold text-foreground text-sm flex-1 truncate">{group.creator.displayName}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-border">
                    {group.items.map(item => {
                      const firstImage = parseFirstImage(item.product.images)
                      const isPhysical = item.product.type === 'PHYSICAL'

                      return (
                        <div key={item.id} className="flex gap-3 px-4 py-4 items-start">
                          {/* Thumbnail */}
                          <div className="w-14 h-14 rounded-lg bg-border overflow-hidden flex-shrink-0">
                            {firstImage ? (
                              <Image
                                src={firstImage}
                                alt={item.product.title}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={20} className="text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm leading-snug">{item.product.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                              {item.product.type === 'DIGITAL' ? 'Digital · Instant download'
                                : item.product.type === 'POD'  ? 'Print-on-demand'
                                : 'Physical'}
                              {item.selectedSize  && ` · ${item.selectedSize}`}
                              {item.selectedColor && ` · ${item.selectedColor}`}
                            </p>

                            {/* Price changed warning */}
                            {item.priceChanged && item.oldPrice !== undefined && (
                              <p className="text-xs text-warning mt-1">
                                Price updated:{' '}
                                <span className="line-through text-muted-foreground">{formatPrice(item.oldPrice)}</span>
                                {' → '}
                                <span className="font-semibold">{formatPrice(item.product.price)}</span>
                              </p>
                            )}

                            {/* Quantity controls (PHYSICAL only) */}
                            {isPhysical ? (
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1, item)}
                                  className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-sm font-medium text-foreground w-4 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1, item)}
                                  className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">Qty: {item.quantity}</p>
                            )}
                          </div>

                          {/* Price + remove */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="text-sm font-semibold text-foreground">
                              {formatPrice(item.product.price * item.quantity)}
                            </span>
                            <button
                              onClick={() => removeItem(item.id, item.product.title)}
                              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              aria-label={`Remove ${item.product.title}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Group subtotal + discount input */}
                  <div className="px-5 py-3 border-t border-border bg-surface space-y-2">
                    <div className="flex justify-end">
                      <span className="text-xs text-muted-foreground">
                        Subtotal: <span className="font-semibold text-foreground">{formatPrice(group.subtotal)}</span>
                      </span>
                    </div>
                    {/* Per-creator discount input */}
                    {(() => {
                      const ds = creatorDiscounts[group.creator.id]
                      if (ds?.applied) {
                        return (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-success">{ds.applied.message}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                (−{formatPrice(ds.applied.discountAmount)})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCreatorDiscount(group.creator.id, { applied: null, code: '', error: null })}
                              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      }
                      return (
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Discount code"
                              value={ds?.code ?? ''}
                              onChange={e => setCreatorDiscount(group.creator.id, { code: e.target.value, error: null })}
                              onKeyDown={e => e.key === 'Enter' && applyDiscountForCreator(group.creator.id)}
                              className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => applyDiscountForCreator(group.creator.id)}
                              disabled={ds?.applying || !ds?.code?.trim()}
                              className="px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/30 text-secondary text-xs font-medium hover:bg-secondary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {ds?.applying ? '...' : 'Apply'}
                            </button>
                          </div>
                          {ds?.error && <p className="text-xs text-destructive">{ds.error}</p>}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )
            })}

            {/* Shipping address form */}
            {liveHasPhysical && (
              <div className="rounded-xl bg-card border border-border p-5 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Shipping Address</h2>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</label>
                    <input type="text" placeholder="Jane Smith" value={shipping.fullName}
                      onChange={e => updateShipping('fullName', e.target.value)} autoComplete="name" className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Address Line 1</label>
                    <input type="text" placeholder="123 Main St" value={shipping.line1}
                      onChange={e => updateShipping('line1', e.target.value)} autoComplete="address-line1" className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Address Line 2 <span className="text-muted-foreground/60">(optional)</span>
                    </label>
                    <input type="text" placeholder="Apt, suite, unit, etc." value={shipping.line2}
                      onChange={e => updateShipping('line2', e.target.value)} autoComplete="address-line2" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">City</label>
                      <input type="text" placeholder="Kuala Lumpur" value={shipping.city}
                        onChange={e => updateShipping('city', e.target.value)} autoComplete="address-level2" className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">State / Region</label>
                      <input type="text" placeholder="Selangor" value={shipping.state}
                        onChange={e => updateShipping('state', e.target.value)} autoComplete="address-level1" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Postal Code</label>
                      <input type="text" placeholder="50000" value={shipping.postal}
                        onChange={e => updateShipping('postal', e.target.value)} inputMode="numeric" autoComplete="postal-code" className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
                      <input type="tel" placeholder="+60 12 345 6789" value={shipping.phone}
                        onChange={e => updateShipping('phone', e.target.value)} autoComplete="tel" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Country</label>
                    <select value={shipping.country} onChange={e => updateShipping('country', e.target.value)}
                      autoComplete="country-name" className={inputClass}>
                      <option value="">Select country...</option>
                      <optgroup label="Southeast Asia">
                        {SEA_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="─────────────────">
                        <option disabled value="">──────────────────────</option>
                      </optgroup>
                      <optgroup label="Other Countries">
                        {OTHER_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right column: order summary (sticky on desktop) ── */}
          <div className="w-full lg:w-72 lg:sticky lg:top-[72px] space-y-4">
            <div className="rounded-xl bg-card border border-border p-5 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Order Summary</h2>

              {/* Per-creator lines with applied discount */}
              {liveGroups.map(group => {
                const ds = creatorDiscounts[group.creator.id]
                return (
                  <div key={group.creator.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-2">
                        {group.creator.displayName}
                        <span className="text-muted-foreground/60"> ({group.items.length})</span>
                      </span>
                      <span className="text-foreground flex-shrink-0">{formatPrice(group.subtotal)}</span>
                    </div>
                    {ds?.applied && (
                      <div className="flex items-center justify-between text-xs mt-0.5">
                        <span className="text-success">{ds.applied.message}</span>
                        <span className="text-success">−{formatPrice(ds.applied.discountAmount)}</span>
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatPrice(liveSubtotal)}</span>
                </div>
                {liveDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-success">Total discount</span>
                    <span className="text-success">−{formatPrice(liveDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing fee (2.5%)</span>
                  <span className="text-foreground">{formatPrice(liveProcessingFee)}</span>
                </div>
              </div>

              {/* Currency selector */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Pay in</label>
                  <select
                    value={selectedCurrency}
                    onChange={e => {
                      setSelectedCurrency(e.target.value as CurrencyCode)
                      setAwPayment(null)
                      setDropinReady(false)
                      setPaymentError(null)
                    }}
                    className="flex-1 min-w-0 rounded-lg bg-background border border-border px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between font-bold pt-1">
                <span className="text-foreground">Total</span>
                <div className="text-right">
                  {selectedCurrency === 'USD' || displayTotal === null ? (
                    <span className="text-xl text-primary">{formatPrice(liveTotal)}</span>
                  ) : (
                    <>
                      <span className="text-xl text-primary">
                        {rateLoading ? '…' : formatDisplay(displayTotal, selectedCurrency)}
                      </span>
                      <p className="text-[10px] text-muted-foreground font-normal">
                        ≈ {formatPrice(liveTotal)} USD
                        {displayRate && !rateLoading && (
                          <> · 1 USD = {displayRate.toFixed(ZERO_DECIMAL.has(selectedCurrency) ? 0 : 2)} {selectedCurrency}</>
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Processed via Airwallex
                {selectedCurrency !== 'USD' && ' · Rate is indicative; exact amount locked at payment'}
              </p>

              {/* Buyer protection */}
              <div className="rounded-lg bg-success/5 border border-success/20 p-3 flex items-center gap-2.5 mt-1">
                <Shield size={16} className="text-success flex-shrink-0" />
                <p className="text-xs text-muted-foreground">Payment held securely per our escrow policy.</p>
              </div>

              {/* Payment area */}
              {awPayment ? (
                <div className="space-y-3 pt-1">
                  {paymentError && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                      {paymentError}
                    </div>
                  )}
                  <div className="relative min-h-[320px]">
                    {!dropinReady && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background z-10">
                        <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm">Loading payment form…</span>
                      </div>
                    )}
                    <div ref={dropinContainerRef} className="min-h-[320px]" />
                  </div>
                  <button
                    onClick={() => router.push('/marketplace')}
                    className="w-full py-2.5 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 rounded-xl transition-all"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleConfirmPay}
                    disabled={loading || liveGroups.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      `Proceed to Payment (${liveTotalItems} item${liveTotalItems !== 1 ? 's' : ''})`
                    )}
                  </button>
                  <button
                    onClick={() => router.push('/marketplace')}
                    className="w-full py-2.5 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 rounded-xl transition-all"
                  >
                    Continue Shopping
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
