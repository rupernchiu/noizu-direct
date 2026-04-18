import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent } from '@/lib/airwallex'
import crypto from 'crypto'

interface ShippingAddress {
  fullName: string
  line1: string
  line2?: string
  city: string
  state: string
  postal: string
  country: string
  phone?: string
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })

  const body = await req.json() as {
    orderId: string
    shippingAddress?: ShippingAddress
    discountCodeId?: string
    discountAmount?: number
  }
  const { orderId: cartSessionId, shippingAddress, discountCodeId, discountAmount: requestedDiscount } = body

  if (!cartSessionId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  // Try single-order lookup first
  const existingOrder = await prisma.order.findFirst({
    where: { id: cartSessionId, buyerId: userId, status: 'PENDING' },
  })

  if (existingOrder) {
    const intent = await createPaymentIntent({
      amount: existingOrder.amountUsd,
      currency: existingOrder.displayCurrency ?? 'USD',
      orderId: existingOrder.id,
      buyerEmail: buyer?.email,
    })
    await prisma.order.update({
      where: { id: existingOrder.id },
      data: { airwallexIntentId: intent.id as string },
    })
    return NextResponse.json({ intentId: intent.id, clientSecret: intent.client_secret })
  }

  // Cart flow: cartSessionId is client-generated. Create PENDING orders from cart.
  const cartItems = await prisma.cartItem.findMany({
    where: { buyerId: userId },
    include: { product: { include: { creator: { include: { user: true } } } } },
  })

  if (cartItems.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

  // Validate availability
  for (const item of cartItems) {
    const p = item.product
    const stockOk = (p as any).isPreOrder || p.stock === null || p.stock === undefined || p.stock >= item.quantity
    if (!p.isActive || p.creator.isSuspended || !stockOk) {
      return NextResponse.json({ error: `"${p.title}" is no longer available` }, { status: 400 })
    }
  }

  // Require shipping address for physical/POD items
  const hasPhysical = cartItems.some(i => i.product.type === 'PHYSICAL' || i.product.type === 'POD')
  if (hasPhysical && !shippingAddress) {
    return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
  }

  // Validate and apply discount if provided.
  // Re-validate discount server-side — never trust the client-supplied amount.
  // Use an atomic conditional-increment to prevent race-condition double-use.
  let verifiedDiscountAmount = 0
  let verifiedDiscountCodeId: string | null = null
  if (discountCodeId && requestedDiscount && requestedDiscount > 0) {
    const dc = await prisma.discountCode.findUnique({ where: { id: discountCodeId } })
    if (
      dc && dc.isActive &&
      (!dc.expiresAt || dc.expiresAt > new Date()) &&
      (dc.maxUses === null || dc.usedCount < dc.maxUses)
    ) {
      // Atomically increment only if the usage limit is still satisfied.
      // updateMany returns a count of rows actually updated; if 0, the code
      // was used up by a concurrent request between our check and now.
      const updated = await prisma.discountCode.updateMany({
        where: {
          id: discountCodeId,
          isActive: true,
          OR: [
            { maxUses: null },
            { maxUses: { gt: dc.usedCount } },
          ],
        },
        data: { usedCount: { increment: 1 } },
      })

      if (updated.count === 0) {
        return NextResponse.json({ error: 'Discount code is no longer available' }, { status: 400 })
      }

      // Server-side recalculate discount amount rather than trusting the client value
      const subtotalForDiscount = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0)
      verifiedDiscountAmount = dc.type === 'PERCENTAGE'
        ? Math.round(subtotalForDiscount * (dc.value / 100))
        : Math.min(dc.value, subtotalForDiscount)
      verifiedDiscountCodeId = discountCodeId
    }
  }

  // Totals
  const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const discountedSubtotal = Math.max(0, subtotal - verifiedDiscountAmount)
  const processingFee = Math.round(discountedSubtotal * 0.025)
  const grandTotal = discountedSubtotal + processingFee

  // Clean up any stale PENDING orders for this buyer before creating new ones
  await prisma.order.deleteMany({ where: { buyerId: userId, status: 'PENDING' } })

  // Group by creator and create PENDING orders
  const creatorMap = new Map<string, typeof cartItems>()
  for (const item of cartItems) {
    const cid = item.product.creatorId
    if (!creatorMap.has(cid)) creatorMap.set(cid, [])
    creatorMap.get(cid)!.push(item)
  }

  const createdOrderIds: string[] = []

  for (const [, items] of creatorMap) {
    const groupSubtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
    const groupFee = Math.round((groupSubtotal / subtotal) * processingFee)
    const orderAmount = groupSubtotal + groupFee
    const isPhysicalGroup = items.some(i => i.product.type === 'PHYSICAL' || i.product.type === 'POD')
    const isDigitalGroup = !isPhysicalGroup

    const groupDiscountShare = verifiedDiscountAmount > 0
      ? Math.round((groupSubtotal / subtotal) * verifiedDiscountAmount)
      : 0
    const order = await prisma.order.create({
      data: {
        buyerId: userId,
        creatorId: items[0].product.creator.userId,
        productId: items[0].productId,
        cartSessionId,
        amountUsd: orderAmount - groupDiscountShare,
        displayCurrency: 'USD',
        displayAmount: orderAmount - groupDiscountShare,
        status: 'PENDING',
        escrowStatus: isDigitalGroup ? 'RELEASED' : 'HELD',
        escrowHeldAt: new Date(),
        fulfillmentDeadline: isPhysicalGroup
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : null,
        shippingAddress: isPhysicalGroup && shippingAddress
          ? JSON.stringify(shippingAddress)
          : null,
        downloadToken: isDigitalGroup ? crypto.randomUUID() : null,
        downloadExpiry: isDigitalGroup
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null,
        discountCodeId: verifiedDiscountCodeId,
        discountAmount: groupDiscountShare,
      },
    })
    createdOrderIds.push(order.id)
  }

  // Discount code usedCount was already incremented atomically above during validation.

  // Create payment intent for the full cart total
  const intent = await createPaymentIntent({
    amount: grandTotal,
    currency: 'USD',
    orderId: cartSessionId,
    buyerEmail: buyer?.email,
  })

  // Store intentId on all created orders
  await prisma.order.updateMany({
    where: { id: { in: createdOrderIds } },
    data: { airwallexIntentId: intent.id as string },
  })

  return NextResponse.json({ intentId: intent.id, clientSecret: intent.client_secret })
}
