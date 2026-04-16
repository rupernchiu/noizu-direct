import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { getDisputeEligibility } from '@/lib/dispute-eligibility'
import DisputeFormClient from './DisputeFormClient'

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      product: { select: { title: true, type: true, images: true } },
      creator: { select: { name: true } },
      dispute: { select: { id: true } },
    },
  })

  if (!order || order.buyerId !== session.user.id) notFound()

  // Guard: already has dispute — redirect to it
  if (order.dispute) {
    redirect(`/account/disputes/${order.dispute.id}`)
  }

  // Guard: not eligible
  const eligibility = getDisputeEligibility(order)
  if (eligibility.status !== 'eligible') {
    redirect('/account/orders')
  }

  let thumbnail: string | null = null
  try {
    const imgs = JSON.parse(order.product.images) as string[]
    thumbnail = Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null
  } catch { /* */ }

  return (
    <DisputeFormClient
      orderId={id}
      productTitle={order.product.title}
      productType={order.product.type}
      creatorName={order.creator.name}
      amountUsd={order.amountUsd}
      orderDate={order.createdAt.toISOString()}
      thumbnail={thumbnail}
    />
  )
}
