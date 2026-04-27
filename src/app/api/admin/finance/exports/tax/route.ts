import React from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { jurisdictionFor } from '@/lib/tax-thresholds'
import { AdminTaxLedger } from '@/lib/pdf/AdminTaxLedger'

// Per-country tax filing report — invoice-level ledger formatted for handoff
// to a tax agent. CSV is the default; PDF is rendered via AdminTaxLedger.
//
// GET /api/admin/finance/exports/tax?country=MY&year=2026&format=csv|pdf
export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const country = url.searchParams.get('country')?.toUpperCase()
  const yearParam = url.searchParams.get('year')
  const format = (url.searchParams.get('format') ?? 'csv').toLowerCase()
  if (!country) return NextResponse.json({ error: 'country query param required' }, { status: 400 })
  const j = jurisdictionFor(country)
  if (!j) return NextResponse.json({ error: `Unknown jurisdiction: ${country}` }, { status: 400 })

  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()
  if (isNaN(year)) return NextResponse.json({ error: 'invalid year' }, { status: 400 })
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  const txs = await prisma.transaction.findMany({
    where: {
      buyerCountry: country,
      createdAt: { gte: yearStart, lt: yearEnd },
      // Phase 2.3 — exclude refunded orders. We keep them in Transaction for
      // forensic audit but they MUST NOT roll into tax remittance totals.
      order: { status: { notIn: ['REFUNDED', 'CANCELLED'] } },
      status: { in: ['COMPLETED', 'ESCROW', 'PAID'] },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      orderId: true,
      createdAt: true,
      grossAmountUsd: true,
      subtotalUsd: true,
      buyerFeeUsd: true,
      creatorCommissionUsd: true,
      creatorTaxUsd: true,
      currency: true,
      paymentRail: true,
      buyerCountry: true,
      order: {
        select: {
          displayCurrency: true,
          displayAmount: true,
          exchangeRate: true,
          exchangeRateAt: true,
          destinationTaxAmountUsd: true,
          destinationTaxRatePercent: true,
          reverseChargeApplied: true,
          buyerBusinessTaxId: true,
        },
      },
    },
  }).catch(() => [])

  if (format === 'pdf') {
    let totalGrossUsd = 0
    let totalDestinationTaxUsd = 0
    const rows = txs.map((t) => {
      const dest = t.order?.destinationTaxAmountUsd ?? 0
      totalGrossUsd += t.grossAmountUsd
      totalDestinationTaxUsd += dest
      return {
        transactionId: t.id,
        orderId: t.orderId,
        createdAt: t.createdAt.toISOString(),
        paymentRail: t.paymentRail ?? null,
        grossUsd: t.grossAmountUsd,
        destinationTaxUsd: dest,
        destinationTaxRate: t.order?.destinationTaxRatePercent ?? null,
        reverseChargeApplied: !!t.order?.reverseChargeApplied,
      }
    })
    const generatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
    const buffer = await (renderToBuffer as any)(
      React.createElement(AdminTaxLedger, {
        data: {
          country: j.country,
          countryName: j.countryName,
          taxLabel: j.taxLabel,
          ratePercent: j.ratePercent,
          year,
          totalGrossUsd,
          totalDestinationTaxUsd,
          txCount: txs.length,
          rows,
        },
        generatedAt,
      }),
    )
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tax-${country}-${year}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  const headers = [
    'transaction_id',
    'order_id',
    'date_utc',
    'buyer_country',
    'payment_rail',
    'subtotal_usd_cents',
    'buyer_fee_usd_cents',
    'creator_commission_usd_cents',
    'creator_tax_usd_cents',
    'destination_tax_usd_cents',
    'destination_tax_rate_percent',
    'reverse_charge_applied',
    'buyer_business_tax_id',
    'gross_usd_cents',
    'display_currency',
    'display_amount_minor',
    'fx_rate_used',
    'fx_rate_at',
    'tax_jurisdiction',
    'tax_label',
    'tax_rate_percent',
  ].join(',')

  const rows = txs.map(t => [
    t.id,
    t.orderId,
    t.createdAt.toISOString(),
    t.buyerCountry ?? '',
    t.paymentRail ?? '',
    t.subtotalUsd ?? '',
    t.buyerFeeUsd ?? '',
    t.creatorCommissionUsd ?? '',
    t.creatorTaxUsd ?? '',
    t.order?.destinationTaxAmountUsd ?? '',
    t.order?.destinationTaxRatePercent ?? '',
    t.order?.reverseChargeApplied ? 'true' : 'false',
    t.order?.buyerBusinessTaxId ?? '',
    t.grossAmountUsd,
    t.order?.displayCurrency ?? t.currency,
    t.order?.displayAmount ?? '',
    t.order?.exchangeRate ?? '',
    t.order?.exchangeRateAt?.toISOString() ?? '',
    j.country,
    j.taxLabel,
    j.ratePercent,
  ].map(v => {
    const s = String(v)
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }).join(','))

  const csv = [headers, ...rows].join('\n')
  const filename = `tax-${country}-${year}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
