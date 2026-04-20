import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent } from '@/lib/airwallex'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId, currency = 'USD', shippingAddress } = await req.json() as {
      orderId: string
      currency?: string
      shippingAddress?: {
        name: string
        address: string
        city: string
        country: string
        postal: string
      }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    })

    if (!order || order.buyerId !== (session.user as { id: string }).id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ error: 'Order already processed' }, { status: 400 })
    }

    const settings = await prisma.platformSettings.findFirst()
    const feePercent = settings?.processingFeePercent ?? 2.5
    const processingFee = Math.round(order.amountUsd * (feePercent / 100))
    const totalCents = order.amountUsd + processingFee

    if (shippingAddress) {
      await prisma.order.update({
        where: { id: orderId },
        data: { shippingAddress: JSON.stringify(shippingAddress) },
      })
    }

    const intent = await createPaymentIntent({
      orderId,
      amount: totalCents,
      currency,
    })

    await prisma.order.update({
      where: { id: orderId },
      data: {
        airwallexIntentId: intent.id as string,
        displayCurrency: currency,
        displayAmount: totalCents,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'
    const isDemo = (process.env.AIRWALLEX_BASE_URL ?? '').includes('demo')
    const checkoutBase = isDemo ? 'https://checkout-demo.airwallex.com' : 'https://checkout.airwallex.com'
    const successUrl = `${appUrl}/order/success?orderId=${orderId}`
    const cancelUrl = `${appUrl}/checkout/${orderId}`
    const hppUrl = intent.client_secret
      ? `${checkoutBase}/#/payment/?intent_id=${intent.id as string}&client_secret=${intent.client_secret as string}&currency=${currency}&successUrl=${encodeURIComponent(successUrl)}&cancelUrl=${encodeURIComponent(cancelUrl)}`
      : null

    return NextResponse.json({
      intentId: intent.id as string,
      hppUrl,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[checkout/intent] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
