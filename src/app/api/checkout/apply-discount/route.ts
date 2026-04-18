import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  // Require authentication — unauthenticated callers must not be able to probe discount codes
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { code: string; productId: string; amountUsd: number }
  const { code, productId, amountUsd } = body

  if (!code || !productId || typeof amountUsd !== 'number') {
    return NextResponse.json({ error: 'code, productId, and amountUsd are required' }, { status: 400 })
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, creatorId: true },
  })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const discountCode = await prisma.discountCode.findUnique({
    where: { code: code.trim().toUpperCase() },
  })

  if (!discountCode) return NextResponse.json({ error: 'Invalid discount code' }, { status: 404 })
  if (!discountCode.isActive) return NextResponse.json({ error: 'This discount code is no longer active' }, { status: 400 })
  if (discountCode.creatorId !== product.creatorId) {
    return NextResponse.json({ error: 'This code is not valid for this product' }, { status: 400 })
  }
  if (discountCode.expiresAt && discountCode.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This discount code has expired' }, { status: 400 })
  }
  if (discountCode.maxUses !== null && discountCode.usedCount >= discountCode.maxUses) {
    return NextResponse.json({ error: 'This discount code has reached its usage limit' }, { status: 400 })
  }
  if (discountCode.productId !== null && discountCode.productId !== productId) {
    return NextResponse.json({ error: 'This code is not valid for this product' }, { status: 400 })
  }
  if (discountCode.minimumOrderAmount !== null && amountUsd < discountCode.minimumOrderAmount) {
    const minFormatted = `$${(discountCode.minimumOrderAmount / 100).toFixed(2)}`
    return NextResponse.json({ error: `Minimum order amount of ${minFormatted} required` }, { status: 400 })
  }

  let discountAmount: number
  if (discountCode.type === 'PERCENTAGE') {
    discountAmount = Math.round(amountUsd * (discountCode.value / 100))
  } else {
    discountAmount = Math.min(discountCode.value, amountUsd)
  }

  const finalAmount = Math.max(0, amountUsd - discountAmount)

  return NextResponse.json({
    discountCodeId: discountCode.id,
    discountAmount,
    finalAmount,
    message: discountCode.type === 'PERCENTAGE'
      ? `${discountCode.value}% off applied`
      : `$${(discountAmount / 100).toFixed(2)} off applied`,
  })
}
