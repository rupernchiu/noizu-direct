import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent, getCurrencyFactor } from '@/lib/airwallex'

const SUPPORTED_CURRENCIES = ['USD', 'MYR', 'SGD', 'PHP', 'THB', 'IDR']

/** Convert a USD-cents amount to the target currency's minor units using live rates. */
async function convertToDisplayCurrency(amountUsdCents: number, currency: string): Promise<number> {
  if (currency === 'USD') return amountUsdCents
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'
  const res = await fetch(`${appUrl}/api/airwallex/fx-rate?to=${currency}&amountUsd=${amountUsdCents}`)
  if (!res.ok) throw new Error(`FX rate unavailable for ${currency}`)
  const { displayAmount } = await res.json() as { displayAmount: number }
  return displayAmount
}

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
    currency?: string
    shippingAddress?: ShippingAddress
    discountCodeId?: string
    discountAmount?: number
  }
  const { orderId: cartSessionId, shippingAddress, discountCodeId, discountAmount: requestedDiscount } = body
  const currency = SUPPORTED_CURRENCIES.includes((body.currency ?? '').toUpperCase())
    ? body.currency!.toUpperCase()
    : 'USD'

  if (!cartSessionId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  // Try single-order lookup first
  const existingOrder = await prisma.order.findFirst({
    where: { id: cartSessionId, buyerId: userId, status: 'PENDING' },
  })

  if (existingOrder) {
    const displayAmount = await convertToDisplayCurrency(existingOrder.amountUsd, currency)
    const intent = await createPaymentIntent({
      amount: displayAmount,
      currency,
      orderId: existingOrder.id,
      buyerEmail: buyer?.email,
    })
    await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        airwallexIntentId: intent.id as string,
        displayCurrency: currency,
        displayAmount,
      },
    })
    return NextResponse.json({ intentId: intent.id, clientSecret: intent.client_secret, currency, displayAmount })
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
    const isCommissionGroup = items.some(i => i.product.type === 'COMMISSION')
    const commissionItem = isCommissionGroup ? items.find(i => i.product.type === 'COMMISSION') : null

    const orderAmountUsd = orderAmount - groupDiscountShare
    const order = await prisma.order.create({
      data: {
        buyerId: userId,
        creatorId: items[0].product.creator.userId,
        productId: items[0].productId,
        cartSessionId,
        amountUsd: orderAmountUsd,
        displayCurrency: currency,   // updated after intent creation below
        displayAmount: orderAmountUsd, // updated after intent creation below
        status: 'PENDING',
        escrowStatus: 'HELD',
        escrowHeldAt: new Date(),
        fulfillmentDeadline: isPhysicalGroup
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : null,
        shippingAddress: isPhysicalGroup && shippingAddress
          ? JSON.stringify(shippingAddress)
          : null,
        // Download token is generated in webhook after payment confirmed — not here
        discountCodeId: verifiedDiscountCodeId,
        discountAmount: groupDiscountShare,
        // Commission fields
        commissionStatus: isCommissionGroup ? 'PENDING_ACCEPTANCE' : null,
        commissionAcceptDeadlineAt: isCommissionGroup
          ? new Date(Date.now() + 48 * 60 * 60 * 1000)
          : null,
        commissionDepositPercent: commissionItem?.product.commissionDepositPercent ?? null,
        commissionDepositAmount: commissionItem?.product.commissionDepositPercent
          ? Math.round((orderAmount - groupDiscountShare) * (commissionItem.product.commissionDepositPercent / 100))
          : null,
        commissionRevisionsAllowed: commissionItem?.product.commissionRevisionsIncluded ?? null,
        commissionDepositConsentAt: isCommissionGroup ? new Date() : null,
      },
    })
    createdOrderIds.push(order.id)
  }

  // Discount code usedCount was already incremented atomically above during validation.

  // Convert grand total to the buyer's selected display currency
  const grandTotalDisplay = await convertToDisplayCurrency(grandTotal, currency)

  // Create payment intent in the buyer's currency — enables local payment methods (FPX, PayNow, etc.)
  const intent = await createPaymentIntent({
    amount: grandTotalDisplay,
    currency,
    orderId: cartSessionId,
    buyerEmail: buyer?.email,
  })

  // Store intentId and resolved display currency/amount on all created orders
  await prisma.order.updateMany({
    where: { id: { in: createdOrderIds } },
    data: {
      airwallexIntentId: intent.id as string,
      displayCurrency: currency,
      displayAmount: Math.round(grandTotalDisplay / createdOrderIds.length), // proportional split
    },
  })

  return NextResponse.json({
    intentId: intent.id,
    clientSecret: intent.client_secret,
    currency,
    displayAmount: grandTotalDisplay,
  })
}
