import { prisma } from '@/lib/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItemWithProduct = {
  id: string
  buyerId: string
  productId: string
  quantity: number
  selectedSize: string | null
  selectedColor: string | null
  addedAt: Date
  unavailable: boolean
  product: {
    id: string
    title: string
    price: number
    images: string
    type: string
    stock: number | null
    isActive: boolean
    creator: {
      id: string
      displayName: string | null
      username: string
      avatar: string | null
      isSuspended: boolean
    }
  }
}

export type CartGroup = {
  creatorId: string
  displayName: string | null
  username: string
  avatar: string | null
  subtotal: number
  items: CartItemWithProduct[]
}

export type CartResponse = {
  items: CartItemWithProduct[]
  groups: CartGroup[]
  subtotal: number
  processingFee: number
  total: number
  itemCount: number
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export async function getCartResponse(buyerId: string): Promise<CartResponse> {
  const rawItems = await prisma.cartItem.findMany({
    where: { buyerId },
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
    orderBy: { addedAt: 'asc' },
  })

  // Annotate each item with unavailability flag
  const items: CartItemWithProduct[] = rawItems.map((item) => {
    const { product } = item
    const outOfStock =
      product.type === 'PHYSICAL' &&
      product.stock !== null &&
      product.stock < 1

    const unavailable =
      product.isActive === false ||
      product.creator.isSuspended === true ||
      outOfStock

    return { ...item, unavailable } as CartItemWithProduct
  })

  // Group by creatorId
  const groupMap = new Map<string, CartGroup>()
  for (const item of items) {
    const { creator } = item.product
    if (!groupMap.has(creator.id)) {
      groupMap.set(creator.id, {
        creatorId: creator.id,
        displayName: creator.displayName,
        username: creator.username,
        avatar: creator.avatar,
        subtotal: 0,
        items: [],
      })
    }
    const group = groupMap.get(creator.id)!
    group.items.push(item)
    if (!item.unavailable) {
      group.subtotal += item.product.price * item.quantity
    }
  }

  const groups = Array.from(groupMap.values())

  const subtotal = groups.reduce((acc, g) => acc + g.subtotal, 0)
  const processingFee = Math.round(subtotal * 0.025)
  const total = subtotal + processingFee
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0)

  return { items, groups, subtotal, processingFee, total, itemCount }
}
