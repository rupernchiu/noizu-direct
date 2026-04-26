import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CheckoutPageClient } from './CheckoutPageClient'
import { calculateFees, getFeeRatesFromSettings } from '@/lib/fees'

export default async function CheckoutPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/checkout')

  const userId = (session.user as any).id as string

  const cartItems = await prisma.cartItem.findMany({
    where: { buyerId: userId },
    include: {
      product: {
        include: {
          creator: {
            select: { id: true, displayName: true, username: true, avatar: true, userId: true }
          }
        }
      }
    },
    orderBy: { addedAt: 'asc' },
  })

  if (cartItems.length === 0) redirect('/marketplace')

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  // Default to the CARD-tier buyer fee (8%) before the buyer picks a rail at
  // the Airwallex DropIn. Local rails (FPX, PayNow…) reprice to 5.5% on the
  // payment-intent route — always strictly less, so the final amount can only
  // go down from this preview.
  const rates = await getFeeRatesFromSettings()
  const breakdown = calculateFees(subtotal, 'CARD', rates, 0)
  const processingFee = breakdown.buyerFeeUsdCents
  const total = breakdown.grossUsdCents
  const feeRate = rates.buyerFeeCardPercent / 100
  const hasPhysical = cartItems.some(i => i.product.type === 'PHYSICAL' || i.product.type === 'POD')

  // Group by creator
  const groupMap = new Map<string, typeof cartItems>()
  for (const item of cartItems) {
    const cid = item.product.creator.id
    if (!groupMap.has(cid)) groupMap.set(cid, [])
    groupMap.get(cid)!.push(item)
  }
  const groups = Array.from(groupMap.entries()).map(([, items]) => ({
    creator: items[0].product.creator,
    items,
    subtotal: items.reduce((s, i) => s + i.product.price * i.quantity, 0),
  }))

  return (
    <CheckoutPageClient
      groups={groups as any}
      subtotal={subtotal}
      processingFee={processingFee}
      total={total}
      hasPhysical={hasPhysical}
      feeRate={feeRate}
    />
  )
}
