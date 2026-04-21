import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductReviewsManager } from './ProductReviewsManager'

export default async function ProductReviewsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')

  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true, displayName: true } })
  if (!profile) redirect('/dashboard')

  const reviews = await prisma.productReview.findMany({
    where: { product: { creatorId: profile.id } },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      product: { select: { id: true, title: true } },
      buyer: { select: { name: true } },
    },
  })

  return (
    <ProductReviewsManager
      initialReviews={reviews.map(r => ({
        id: r.id,
        productId: r.product.id,
        productTitle: r.product.title,
        creatorName: profile.displayName,
        buyerName: r.buyer.name,
        rating: r.rating,
        title: r.title ?? null,
        body: r.body ?? null,
        createdAt: r.createdAt.toISOString(),
        displayOrder: r.displayOrder,
        status: (r as any).status ?? 'PENDING',
      }))}
    />
  )
}
