import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { PurchaseReceipt } from '@/lib/pdf/PurchaseReceipt'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'
import React from 'react'
import { getProcessingFeeRate, feeFromGross } from '@/lib/platform-fees'
import { breakdownFromOrderSnapshot } from '@/lib/fees'

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

  // Prefer the rail-aware snapshot stamped on the order at checkout (sprint
  // 0.1+). Pre-snapshot orders fall back to the legacy 2.5% feeFromGross so
  // historical receipts stay reproducible.
  //
  // Phase 8 — under the new escrow framing the receipt renders the creator
  // tax (Phase 2.1 markup) and platform fees as separate conditional lines.
  // We therefore pass the PURE buyer fee in `processingFee` here; the receipt
  // component renders any creator tax / Phase 8 lines from their own props.
  const snapshot = breakdownFromOrderSnapshot(order)
  let subtotal: number
  let processingFee: number
  if (snapshot) {
    subtotal = snapshot.subtotalUsdCents
    processingFee = snapshot.buyerFeeUsdCents
  } else {
    const feeRate = await getProcessingFeeRate()
    processingFee = feeFromGross(order.amountUsd, feeRate)
    subtotal = order.amountUsd - processingFee
  }
  const total = order.amountUsd

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
      amountUsd: subtotal,
      processingFee,
      total,
      currency: order.displayCurrency,
      orderId: order.id,
      // Phase 8 — escrow framing extras (all optional; render only when > 0).
      shippingUsd: order.shippingCostUsd,
      discountUsd: order.discountAmount,
      creatorSalesTaxUsd: order.creatorSalesTaxAmountUsd,
      creatorSalesTaxRate: order.creatorSalesTaxRatePercent,
      creatorSalesTaxLabel: order.creatorSalesTaxLabel,
      platformFeeBuyerTaxUsd: order.platformFeeBuyerTaxUsd,
      platformFeeBuyerTaxRate: order.platformFeeBuyerTaxRate,
      destinationTaxUsd: order.destinationTaxAmountUsd,
      destinationTaxRatePercent: order.destinationTaxRatePercent,
      destinationTaxCountry: order.destinationTaxCountry,
      creatorTaxUsd: order.creatorTaxAmountUsd,
      creatorTaxRatePercent: order.creatorTaxRatePercent,
      reverseChargeApplied: order.reverseChargeApplied,
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
