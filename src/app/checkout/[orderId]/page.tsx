import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CheckoutClient } from '@/components/checkout/CheckoutClient'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ orderId: string }>
}

const PROCESSING_FEE_PERCENT = 2.5

export default async function CheckoutPage({ params }: PageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const { orderId } = await params

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      creator: { select: { name: true } },
      buyer: { select: { id: true } },
    },
  })

  if (!order || order.buyer.id !== (session.user as { id: string }).id) notFound()

  if (order.status !== 'PENDING') {
    redirect(`/order/success?orderId=${orderId}`)
  }

  const processingFee = Math.round(order.amountUsd * PROCESSING_FEE_PERCENT / 100)
  const total = order.amountUsd + processingFee

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Complete your order</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            From <span className="text-foreground">{order.creator.name}</span>
          </p>
        </div>

        <CheckoutClient
          orderId={orderId}
          productTitle={order.product.title}
          productType={order.product.type}
          amountUsd={order.amountUsd}
          processingFee={processingFee}
          total={total}
          productId={order.productId}
        />
      </div>
    </div>
  )
}
