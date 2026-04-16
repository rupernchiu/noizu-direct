import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guards'
import { getCartResponse } from './_cart-helpers'

// ─── GET /api/cart ────────────────────────────────────────────────────────────

export async function GET() {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const buyerId = (session.user as any).id as string

  try {
    const cart = await getCartResponse(buyerId)
    return NextResponse.json(cart)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/cart ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const buyerId = (session.user as any).id as string

  try {
    const body = await req.json() as {
      productId: string
      quantity?: number
      selectedSize?: string
      selectedColor?: string
    }

    const { productId } = body
    const selectedSize = body.selectedSize ?? null
    const selectedColor = body.selectedColor ?? null
    let quantity = body.quantity ?? 1

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // Fetch product to validate
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        creator: { select: { id: true, isSuspended: true } },
      },
    })

    if (!product || !product.isActive || product.creator.isSuspended) {
      return NextResponse.json({ error: 'Product not available' }, { status: 400 })
    }

    // Clamp quantity by product type
    if (product.type === 'DIGITAL' || product.type === 'POD') {
      quantity = 1
    } else if (product.type === 'PHYSICAL') {
      const stock = product.stock ?? 0
      if (stock < 1) {
        return NextResponse.json({ error: 'Product is out of stock' }, { status: 400 })
      }
      quantity = Math.min(quantity, stock)
    }

    // Check for existing duplicate (same productId + selectedSize + selectedColor)
    const existing = await prisma.cartItem.findFirst({
      where: {
        buyerId,
        productId,
        selectedSize,
        selectedColor,
      },
    })

    if (existing) {
      // Update quantity on duplicate
      const newQty =
        product.type === 'DIGITAL' || product.type === 'POD'
          ? 1
          : product.type === 'PHYSICAL'
          ? Math.min(quantity, product.stock ?? 1)
          : quantity

      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      })
    } else {
      // Enforce total cart item cap (20 unique line items)
      const totalCount = await prisma.cartItem.count({ where: { buyerId } })
      if (totalCount >= 20) {
        return NextResponse.json({ error: 'Cart limit of 20 items reached' }, { status: 400 })
      }

      // Enforce per-creator cap (10 items)
      const creatorItemCount = await prisma.cartItem.count({
        where: {
          buyerId,
          product: { creatorId: product.creatorId },
        },
      })
      if (creatorItemCount >= 10) {
        return NextResponse.json(
          { error: 'Maximum 10 items per creator allowed' },
          { status: 400 },
        )
      }

      await prisma.cartItem.create({
        data: {
          buyerId,
          productId,
          quantity,
          selectedSize,
          selectedColor,
        },
      })
    }

    const cart = await getCartResponse(buyerId)
    return NextResponse.json(cart)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/cart ─────────────────────────────────────────────────────────

export async function DELETE() {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const buyerId = (session.user as any).id as string

  try {
    await prisma.cartItem.deleteMany({ where: { buyerId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
