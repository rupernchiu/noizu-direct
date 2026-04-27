import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { getTrackingUrl, getCourierName } from '@/lib/courier-tracking'
import OrderDetailClient from './OrderDetailClient'

export default async function BuyerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          title: true,
          type: true,
          images: true,
          podProviderId: true,
          // Phase 8 — creator displayName powers the "FROM CREATOR" header
          // on the escrow-framed receipt.
          creator: { select: { displayName: true, username: true } },
        },
      },
      buyer: { select: { name: true } },
      dispute: { select: { id: true, reason: true, status: true, createdAt: true } },
    },
  })

  if (!order || order.buyerId !== session.user.id) notFound()

  const trackingUrl = order.courierCode && order.trackingNumber
    ? getTrackingUrl(order.courierCode, order.trackingNumber)
    : null
  const courierDisplayName = order.courierCode ? getCourierName(order.courierCode) : order.courierName

  return <OrderDetailClient order={order} trackingUrl={trackingUrl} courierDisplayName={courierDisplayName ?? null} />
}
