import { NextResponse } from 'next/server'
import { requireAuth, unauthorized } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent } from '@/lib/airwallex'

interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state?: string
  postal: string
  country: string
  phone?: string
}

export async function POST(req: Request) {
  const session = await requireAuth()
  if (!session) return unauthorized()

  const userId = (session.user as { id: string }).id

  const body = await req.json() as { shippingAddress?: ShippingAddress }
  const { shippingAddress } = body

  // Fetch buyer's full cart
  const cartItems = await prisma.cartItem.findMany({
    where: { buyerId: userId },
    include: {
      product: {
        include: {
          creator: {
            include: { user: true },
          },
        },
      },
    },
  })

  if (cartItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  // Validate all items are available
  const unavailableItems: string[] = []
  for (const item of cartItems) {
    const p = item.product
    const isUnavailable =
      !p.isActive ||
      p.creator.isSuspended ||
      (p.stock !== null && p.stock !== undefined && p.stock < item.quantity)

    if (isUnavailable) {
      unavailableItems.push(p.title)
    }
  }

  if (unavailableItems.length > 0) {
    return NextResponse.json(
      { error: 'Some items are unavailable', unavailableItems },
      { status: 400 },
    )
  }

  // Validate physical/POD items require shippingAddress
  const hasPhysical = cartItems.some(
    (item) => item.product.type === 'PHYSICAL' || item.product.type === 'POD',
  )
  if (hasPhysical && !shippingAddress) {
    return NextResponse.json(
      { error: 'Shipping address is required for physical or print-on-demand items' },
      { status: 400 },
    )
  }

  // Calculate totals (prices in cents)
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )
  const processingFee = Math.round(subtotal * 0.025)
  const grandTotal = subtotal + processingFee

  // Generate cartSessionId
  const cartSessionId = `cart_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  // Build orderBreakdown grouped by creator
  const creatorMap = new Map<
    string,
    {
      creatorId: string
      creatorName: string
      items: { productId: string; title: string; quantity: number; price: number }[]
      subtotal: number
    }
  >()

  for (const item of cartItems) {
    const creatorProfileId = item.product.creatorId
    const creatorName = item.product.creator.displayName
    if (!creatorMap.has(creatorProfileId)) {
      creatorMap.set(creatorProfileId, {
        creatorId: creatorProfileId,
        creatorName,
        items: [],
        subtotal: 0,
      })
    }
    const group = creatorMap.get(creatorProfileId)!
    group.items.push({
      productId: item.productId,
      title: item.product.title,
      quantity: item.quantity,
      price: item.product.price,
    })
    group.subtotal += item.product.price * item.quantity
  }

  const orderBreakdown = Array.from(creatorMap.values())

  // Call Airwallex to create payment intent
  if (!process.env.AIRWALLEX_CLIENT_ID || !process.env.AIRWALLEX_API_KEY) {
    return NextResponse.json({
      cartSessionId,
      grandTotal,
      processingFee,
      subtotal,
      hppUrl: null,
      intentId: null,
      orderBreakdown,
      shippingAddress: shippingAddress ?? null,
    })
  }

  try {
    const intent = await createPaymentIntent({
      orderId: cartSessionId,
      amountCents: grandTotal,
      currency: 'USD',
      merchantOrderId: cartSessionId,
    })

    return NextResponse.json({
      cartSessionId,
      intentId: (intent.id as string) ?? null,
      hppUrl: (intent.next_action?.url as string) ?? null,
      grandTotal,
      processingFee,
      subtotal,
      orderBreakdown,
      shippingAddress: shippingAddress ?? null,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Airwallex error:', msg)
    return NextResponse.json({
      cartSessionId,
      grandTotal,
      processingFee,
      subtotal,
      hppUrl: null,
      intentId: null,
      orderBreakdown,
      shippingAddress: shippingAddress ?? null,
      error: msg,
    })
  }
}
