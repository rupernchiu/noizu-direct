import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { PurchaseReceipt } from '@/lib/pdf/PurchaseReceipt'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'
import React from 'react'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await req.json()
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: true,
      product: true,
      creator: true,
    },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const settings = await prisma.platformSettings.findFirst()
  const feePercent = settings?.processingFeePercent ?? 2.5
  const processingFee = Math.round(order.amountUsd * (feePercent / 100))
  const total = order.amountUsd + processingFee

  const invoiceCount = await prisma.invoice.count()
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`

  const buffer = await (renderToBuffer as any)(
    React.createElement(PurchaseReceipt, {
      invoiceNumber,
      date: new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      buyerName: order.buyer.name,
      buyerEmail: order.buyer.email,
      productTitle: order.product.title,
      creatorName: order.creator.name,
      amountUsd: order.amountUsd,
      processingFee,
      total,
      currency: order.displayCurrency,
      orderId: order.id,
    })
  )

  const dir = join(process.cwd(), 'storage', 'invoices', 'purchase')
  mkdirSync(dir, { recursive: true })
  const filename = `${invoiceNumber}.pdf`
  writeFileSync(join(dir, filename), buffer)

  const invoice = await prisma.invoice.upsert({
    where: { referenceNumber: invoiceNumber },
    update: { pdfPath: `/storage/invoices/purchase/${filename}` },
    create: {
      type: 'PURCHASE',
      referenceNumber: invoiceNumber,
      issuedToId: order.buyerId,
      issuedToType: 'BUYER',
      amountUsd: total,
      items: JSON.stringify([{ title: order.product.title, amount: order.amountUsd }]),
      pdfPath: `/storage/invoices/purchase/${filename}`,
      orderId: order.id,
    },
  })

  return NextResponse.json({ invoiceNumber, pdfPath: invoice.pdfPath })
}
