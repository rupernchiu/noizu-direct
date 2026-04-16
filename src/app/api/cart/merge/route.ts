import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guards'
import { getCartResponse } from '../_cart-helpers'

type GuestItem = {
  productId: string
  quantity: number
  selectedSize?: string
  selectedColor?: string
}

// ─── POST /api/cart/merge ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const buyerId = (session.user as any).id as string

  try {
    const body = await req.json() as { items: GuestItem[] }
    const guestItems: GuestItem[] = Array.isArray(body?.items) ? body.items : []

    for (const guestItem of guestItems) {
      const { productId, selectedSize = null, selectedColor = null } = guestItem
      let quantity = guestItem.quantity ?? 1

      if (!productId) continue

      // Skip unavailable products silently
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          creator: { select: { isSuspended: true } },
        },
      })

      if (!product || !product.isActive || product.creator.isSuspended) continue

      // Clamp quantity by product type
      if (product.type === 'DIGITAL' || product.type === 'POD') {
        quantity = 1
      } else if (product.type === 'PHYSICAL') {
        const stock = product.stock ?? 0
        if (stock < 1) continue
        quantity = Math.min(quantity, stock)
      }

      // Check for existing DB cart item with same key
      const existing = await prisma.cartItem.findFirst({
        where: {
          buyerId,
          productId,
          selectedSize,
          selectedColor,
        },
      })

      if (existing) {
        // Keep the higher quantity — don't double-add
        const keepQty =
          product.type === 'DIGITAL' || product.type === 'POD'
            ? 1
            : product.type === 'PHYSICAL'
            ? Math.min(Math.max(existing.quantity, quantity), product.stock ?? existing.quantity)
            : Math.max(existing.quantity, quantity)

        if (keepQty !== existing.quantity) {
          await prisma.cartItem.update({
            where: { id: existing.id },
            data: { quantity: keepQty },
          })
        }
      } else {
        // Only insert if under global cap (20 items) and per-creator cap (10 items)
        const totalCount = await prisma.cartItem.count({ where: { buyerId } })
        if (totalCount >= 20) continue

        const creatorItemCount = await prisma.cartItem.count({
          where: {
            buyerId,
            product: { creatorId: product.creatorId },
          },
        })
        if (creatorItemCount >= 10) continue

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
    }

    const cart = await getCartResponse(buyerId)
    return NextResponse.json(cart)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
