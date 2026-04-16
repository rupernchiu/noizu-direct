import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { WishlistClient } from './WishlistClient'

export default async function WishlistPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const items = await prisma.wishlistItem.findMany({
    where: { buyerId: userId },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          type: true,
          category: true,
          stock: true,
          isActive: true,
          creator: {
            select: {
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  })

  const ownedProductIds = await prisma.order
    .findMany({
      where: {
        buyerId: userId,
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] },
      },
      select: { productId: true },
    })
    .then(orders => new Set(orders.map(o => o.productId)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wishlist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Products you&apos;ve saved for later
        </p>
      </div>

      <WishlistClient items={items} ownedProductIds={[...ownedProductIds]} />
    </div>
  )
}
