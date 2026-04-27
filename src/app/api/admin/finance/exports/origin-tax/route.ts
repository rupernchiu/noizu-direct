/**
 * GET /api/admin/finance/exports/origin-tax?country=ID&period=2026-04&format=csv|pdf
 *
 * DJP-filing-ready report for creator-origin (PPh) withholding. Mirrors the
 * `/admin/finance/tax/origin` JSON shape but emits CSV (default) or PDF.
 *
 * The PDF rendering uses `AdminOriginTaxReport` which is the canonical artifact
 * the admin hands to their konsultan pajak each month.
 *
 * Auth: admin only.
 */
import React from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { countryFor } from '@/lib/countries'
import { AdminOriginTaxReport } from '@/lib/pdf/AdminOriginTaxReport'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parsePeriod(url: URL): { from: Date; to: Date; label: string; slug: string } {
  const period = url.searchParams.get('period')
  const fromRaw = url.searchParams.get('from')
  const toRaw = url.searchParams.get('to')
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map((s) => parseInt(s, 10))
    const from = new Date(Date.UTC(y, m - 1, 1))
    const to = new Date(Date.UTC(y, m, 1))
    return { from, to, label: `${MONTH_NAMES[m - 1]} ${y}`, slug: period }
  }
  if (fromRaw && toRaw) {
    const from = new Date(fromRaw)
    const to = new Date(toRaw)
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      return {
        from, to,
        label: `${from.toISOString().slice(0, 10)} → ${new Date(to.getTime() - 1).toISOString().slice(0, 10)}`,
        slug: `${from.toISOString().slice(0, 10)}_${new Date(to.getTime() - 1).toISOString().slice(0, 10)}`,
      }
    }
  }
  const now = new Date()
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const slug = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  return { from, to, label: `${MONTH_NAMES[from.getUTCMonth()]} ${from.getUTCFullYear()}`, slug }
}

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const country = (url.searchParams.get('country') ?? 'ID').toUpperCase()
  const creatorId = url.searchParams.get('creatorId') || null
  const format = (url.searchParams.get('format') ?? 'csv').toLowerCase()
  const { from, to, label, slug } = parsePeriod(url)

  const countryRecord = countryFor(country)
  const countryName = countryRecord?.name ?? country
  const originRule = countryRecord?.creatorOriginTax ?? null

  const orders = await prisma.order.findMany({
    where: {
      creatorCountry: country,
      creatorTaxAmountUsd: { gt: 0 },
      createdAt: { gte: from, lt: to },
      escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'RELEASED', 'PARTIALLY_REFUNDED'] },
      ...(creatorId ? { creatorId } : {}),
    },
    select: {
      id: true,
      creatorId: true,
      amountUsd: true,
      subtotalUsd: true,
      shippingCostUsd: true,
      buyerFeeUsd: true,
      creatorTaxAmountUsd: true,
      creator: {
        select: {
          name: true,
          email: true,
          legalFullName: true,
          creatorProfile: {
            select: { displayName: true, taxId: true, payoutCountry: true, taxJurisdiction: true },
          },
        },
      },
    },
  }).catch(() => [])

  const byCreator = new Map<string, {
    creatorId: string
    creatorName: string
    displayName: string | null
    email: string | null
    taxId: string | null
    country: string
    orderCount: number
    grossUsd: number
    withheldUsd: number
  }>()
  let totalGrossUsd = 0
  let totalWithheldUsd = 0

  for (const o of orders) {
    const subtotal = o.subtotalUsd ?? Math.max(0, o.amountUsd - (o.buyerFeeUsd ?? 0))
    const shipping = o.shippingCostUsd ?? 0
    const gross = subtotal + shipping
    const withheld = o.creatorTaxAmountUsd ?? 0
    totalGrossUsd += gross
    totalWithheldUsd += withheld
    const cid = o.creatorId
    const cur = byCreator.get(cid) ?? {
      creatorId: cid,
      creatorName: o.creator?.legalFullName ?? o.creator?.name ?? '',
      displayName: o.creator?.creatorProfile?.displayName ?? null,
      email: o.creator?.email ?? null,
      taxId: o.creator?.creatorProfile?.taxId ?? null,
      country: (o.creator?.creatorProfile?.payoutCountry ?? o.creator?.creatorProfile?.taxJurisdiction ?? country).toUpperCase(),
      orderCount: 0,
      grossUsd: 0,
      withheldUsd: 0,
    }
    cur.orderCount += 1
    cur.grossUsd += gross
    cur.withheldUsd += withheld
    byCreator.set(cid, cur)
  }

  const creators = Array.from(byCreator.values()).sort((a, b) => b.withheldUsd - a.withheldUsd)
  const ratePct = originRule ? originRule.rate * 100 : 0
  const filenameBase = `${(originRule?.label ?? 'origin').toLowerCase().replace(/\s+/g, '-')}-filing-${country.toLowerCase()}-${slug}`

  if (format === 'pdf') {
    const generatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
    const buffer = await (renderToBuffer as any)(
      React.createElement(AdminOriginTaxReport, {
        data: {
          period: {
            from: from.toISOString(),
            to: to.toISOString(),
            label,
            country,
            countryName,
          },
          rule: originRule ? { rate: originRule.rate, label: originRule.label, ratePercent: ratePct } : null,
          totalGrossUsd,
          totalWithheldUsd,
          creatorCount: creators.length,
          orderCount: orders.length,
          creators,
        },
        generatedAt,
      }),
    )
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // CSV (default)
  const headers = [
    'creator_id',
    'creator_name',
    'display_name',
    'creator_email',
    'tax_id',
    'country',
    'period',
    'order_count',
    'gross_usd_cents',
    'withheld_usd_cents',
    'tax_label',
    'tax_rate_percent',
  ].join(',')

  const csvEscape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }

  const rows = creators.map((c) => [
    c.creatorId,
    c.creatorName,
    c.displayName ?? '',
    c.email ?? '',
    c.taxId ?? '',
    c.country,
    label,
    c.orderCount,
    c.grossUsd,
    c.withheldUsd,
    originRule?.label ?? '',
    ratePct,
  ].map(csvEscape).join(','))

  const summary = [
    `# ${originRule?.label ?? 'Creator-origin tax'} withholding filing — ${countryName} (${country})`,
    `# Period: ${label}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Total creators: ${creators.length}`,
    `# Total orders: ${orders.length}`,
    `# Total gross (USD cents): ${totalGrossUsd}`,
    `# Total withheld (USD cents): ${totalWithheldUsd}`,
    `#`,
    `# Hand to your registered tax agent for filing. Convert USD→local at the`,
    `# daily Airwallex FX rate from the transaction date.`,
    '',
  ].join('\n')

  const csv = [summary, headers, ...rows].join('\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
