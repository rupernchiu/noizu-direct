import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guards'
import { getCartResponse } from '../_cart-helpers'

// ─── PATCH /api/cart/[id] ─────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const buyerId = (session.user as any).id as string
  const { id } = await params

  try {
    const body = await req.json() as { quantity: number }
    const { quantity } = body

    if (typeof quantity !== 'number') {
      return NextResponse.json({ error: 'quantity is required' }, { status: 400 })
    }

    // Verify the item belongs to this buyer
    const item = await prisma.cartItem.findUnique({
      where: { id },
      include: {
        product: {
          select: { type: true, stock: true, isActive: true },
        },
      },
    })

    if (!item) return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    if (item.buyerId !== buyerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Quantity 0 → delete
    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }

    const { product } = item

    // Digital/POD: reject quantity > 1
    if (product.type === 'DIGITAL' || product.type === 'POD') {
      if (quantity > 1) {
        return NextResponse.json(
          { error: 'Quantity must be 1 for digital and print-on-demand products' },
          { status: 400 },
        )
      }
    }

    // Physical: clamp to stock
    let finalQty = quantity
    if (product.type === 'PHYSICAL') {
      const stock = product.stock ?? 0
      if (stock < 1) {
        return NextResponse.json({ error: 'Product is out of stock' }, { status: 400 })
      }
      finalQty = Math.min(quantity, stock)
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity: finalQty },
      include: {
        product: {
          include: {
            creator: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatar: true,
                isSuspended: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/cart/[id] ────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const buyerId = (session.user as any).id as string
  const { id } = await params

  try {
    const item = await prisma.cartItem.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    if (item.buyerId !== buyerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.cartItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
