import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminReviewsClient } from './AdminReviewsClient'

export default async function AdminReviewsPage() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/')

  const [reviews, guestbook] = await Promise.all([
    prisma.productReview.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, title: true, creator: { select: { displayName: true } } },
        },
        buyer: { select: { name: true } },
      },
    }),
    prisma.creatorGuestbook.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true } },
        creatorProfile: { select: { username: true, displayName: true } },
      },
    }),
  ])

  return (
    <AdminReviewsClient
      initialReviews={reviews.map(r => ({
        id: r.id,
        productId: r.product.id,
        productTitle: r.product.title,
        creatorName: r.product.creator.displayName,
        buyerName: r.buyer.name,
        rating: r.rating,
        title: r.title ?? null,
        body: r.body ?? null,
        isVisible: r.isVisible,
        createdAt: r.createdAt.toISOString(),
      }))}
      initialMessages={guestbook.map(e => ({
        id: e.id,
        senderName: e.author.name,
        creatorUsername: e.creatorProfile.username,
        creatorName: e.creatorProfile.displayName,
        content: e.content,
        createdAt: e.createdAt.toISOString(),
      }))}
    />
  )
}
