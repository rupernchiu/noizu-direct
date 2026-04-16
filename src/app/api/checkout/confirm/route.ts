import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAuth, unauthorized } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

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

  const body = await req.json() as {
    cartSessionId: string
    airwallexPaymentId?: string
    shippingAddress?: ShippingAddress
  }
  const { cartSessionId, airwallexPaymentId, shippingAddress } = body

  // Re-fetch buyer's cart
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

  // Re-validate all items are available
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

  // Re-calculate totals (don't trust client-side totals)
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )
  const processingFee = Math.round(subtotal * 0.025)

  // Group cart items by creatorId (CreatorProfile.id)
  const creatorMap = new Map<
    string,
    {
      creatorUserId: string
      creatorName: string
      items: typeof cartItems
    }
  >()

  for (const item of cartItems) {
    const creatorProfileId = item.product.creatorId
    if (!creatorMap.has(creatorProfileId)) {
      creatorMap.set(creatorProfileId, {
        creatorUserId: item.product.creator.userId,
        creatorName: item.product.creator.displayName,
        items: [],
      })
    }
    creatorMap.get(creatorProfileId)!.items.push(item)
  }

  const createdOrders: {
    id: string
    creatorName: string
    items: { productId: string; title: string; quantity: number }[]
    type: string
    downloadToken?: string | null
    escrowStatus: string
  }[] = []

  for (const [, group] of creatorMap) {
    const { creatorUserId, creatorName, items } = group

    const groupSubtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    )
    // Proportional share of processing fee
    const groupFee = Math.round((groupSubtotal / subtotal) * processingFee)
    const orderAmount = groupSubtotal + groupFee

    const hasPhysical = items.some(
      (item) => item.product.type === 'PHYSICAL' || item.product.type === 'POD',
    )
    const allDigital = !hasPhysical

    const order = await prisma.order.create({
      data: {
        buyerId: userId,
        creatorId: creatorUserId,
        productId: items[0].productId,
        cartSessionId,
        amountUsd: orderAmount,
        status: 'PAID',
        escrowStatus: allDigital ? 'RELEASED' : 'HELD',
        escrowHeldAt: new Date(),
        fulfillmentDeadline: hasPhysical
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : null,
        shippingAddress:
          hasPhysical && shippingAddress ? JSON.stringify(shippingAddress) : null,
        airwallexIntentId: airwallexPaymentId ?? null,
      },
    })

    // Generate downloadToken for digital orders
    let downloadToken: string | null = null
    if (allDigital) {
      downloadToken = crypto.randomUUID()
      const downloadExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await prisma.order.update({
        where: { id: order.id },
        data: { downloadToken, downloadExpiry },
      })
    }

    // Create Transaction record
    const txProcessingFee = Math.round(orderAmount * 0.025)
    await prisma.transaction.create({
      data: {
        orderId: order.id,
        buyerId: userId,
        creatorId: creatorUserId,
        grossAmountUsd: orderAmount,
        processingFee: txProcessingFee,
        platformFee: 0,
        creatorAmount: orderAmount - txProcessingFee,
        status: 'COMPLETED',
      },
    })

    // Notify creator
    await prisma.notification.create({
      data: {
        userId: creatorUserId,
        type: 'NEW_ORDER',
        title: 'New order received',
        message: `You have a new order from a buyer.`,
        orderId: order.id,
        actionUrl: `/dashboard/orders/${order.id}`,
      },
    })

    createdOrders.push({
      id: order.id,
      creatorName,
      items: items.map((item) => ({
        productId: item.productId,
        title: item.product.title,
        quantity: item.quantity,
      })),
      type: hasPhysical ? (items.some((i) => i.product.type === 'POD') ? 'POD' : 'PHYSICAL') : 'DIGITAL',
      downloadToken: downloadToken ?? undefined,
      escrowStatus: order.escrowStatus,
    })
  }

  // Notify buyer — one notification for all orders
  await prisma.notification.create({
    data: {
      userId,
      type: 'ORDER_CONFIRMED',
      title: 'Order confirmed',
      message: `Order confirmed — ${createdOrders.length} order${createdOrders.length !== 1 ? 's' : ''} created`,
      actionUrl: '/account/orders',
    },
  })

  // Clear buyer's cart
  await prisma.cartItem.deleteMany({ where: { buyerId: userId } })

  return NextResponse.json({
    orders: createdOrders,
    cartSessionId,
  })
}
