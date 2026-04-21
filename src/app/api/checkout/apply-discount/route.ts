import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

interface CartGroup {
  creatorId: string
  productIds: string[]  // all product IDs from this creator (for product-specific code validation)
  subtotal: number      // this creator's subtotal in USD cents
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { code: string; cartGroups: CartGroup[] }
  const { code, cartGroups } = body

  if (!code || !Array.isArray(cartGroups) || cartGroups.length === 0) {
    return NextResponse.json({ error: 'code and cartGroups are required' }, { status: 400 })
  }

  const discountCode = await prisma.discountCode.findUnique({
    where: { code: code.trim().toUpperCase() },
  })

  if (!discountCode) return NextResponse.json({ error: 'Invalid discount code' }, { status: 404 })
  if (!discountCode.isActive) return NextResponse.json({ error: 'This discount code is no longer active' }, { status: 400 })
  if (discountCode.expiresAt && discountCode.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This discount code has expired' }, { status: 400 })
  }
  if (discountCode.maxUses !== null && discountCode.usedCount >= discountCode.maxUses) {
    return NextResponse.json({ error: 'This discount code has reached its usage limit' }, { status: 400 })
  }

  // Find the cart group that belongs to this code's creator
  const matchingGroup = cartGroups.find(g => g.creatorId === discountCode.creatorId)
  if (!matchingGroup) {
    return NextResponse.json({ error: 'This code is not valid for any items in your cart' }, { status: 400 })
  }

  // If code is product-specific, verify that exact product is in the cart
  if (discountCode.productId !== null) {
    const productInCart = cartGroups.some(
      g => g.creatorId === discountCode.creatorId && g.productIds.includes(discountCode.productId!)
    )
    if (!productInCart) {
      const product = await prisma.product.findUnique({
        where: { id: discountCode.productId },
        select: { title: true },
      })
      const name = product?.title ?? 'a specific product'
      return NextResponse.json(
        { error: `This code is only valid for "${name}". Add it to your cart first.` },
        { status: 400 }
      )
    }
  }

  // Minimum order check is against this creator's subtotal only
  if (discountCode.minimumOrderAmount !== null && matchingGroup.subtotal < discountCode.minimumOrderAmount) {
    const minFormatted = `$${(discountCode.minimumOrderAmount / 100).toFixed(2)}`
    return NextResponse.json({ error: `Minimum order of ${minFormatted} required from this creator` }, { status: 400 })
  }

  // Calculate discount on this creator's subtotal only
  let discountAmount: number
  if (discountCode.type === 'PERCENTAGE') {
    discountAmount = Math.round(matchingGroup.subtotal * (discountCode.value / 100))
  } else {
    discountAmount = Math.min(discountCode.value, matchingGroup.subtotal)
  }

  const finalAmount = Math.max(0, matchingGroup.subtotal - discountAmount)

  return NextResponse.json({
    discountCodeId: discountCode.id,
    creatorId: discountCode.creatorId,
    discountAmount,
    finalAmount,
    message: discountCode.type === 'PERCENTAGE'
      ? `${discountCode.value}% off applied`
      : `$${(discountAmount / 100).toFixed(2)} off applied`,
  })
}
