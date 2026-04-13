import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''
  const secret = process.env.AIRWALLEX_WEBHOOK_SECRET ?? ''

  if (secret) {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
    if (expected !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const event = JSON.parse(body) as {
    name: string
    data?: { object?: { id?: string } }
  }

  if (event.name === 'payment_intent.succeeded') {
    const intentId = event.data?.object?.id
    if (!intentId) return NextResponse.json({ ok: true })

    const order = await prisma.order.findFirst({ where: { airwallexIntentId: intentId } })
    if (!order || order.status === 'PAID') return NextResponse.json({ ok: true })

    const settings = await prisma.platformSettings.findFirst()
    const feePercent = settings?.processingFeePercent ?? 2.5
    const processingFee = Math.round(order.amountUsd * (feePercent / 100))
    const withdrawalProvision = Math.round(order.amountUsd * 0.04)
    const creatorAmount = order.amountUsd - withdrawalProvision

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        downloadToken: uuidv4(),
        downloadExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    })

    await prisma.transaction.create({
      data: {
        orderId: order.id,
        buyerId: order.buyerId,
        creatorId: order.creatorId,
        grossAmountUsd: order.amountUsd,
        processingFee,
        platformFee: 0,
        withdrawalFee: 0,
        creatorAmount,
        currency: order.displayCurrency,
        airwallexReference: intentId,
        status: 'COMPLETED',
      },
    })
  }

  return NextResponse.json({ ok: true })
}
