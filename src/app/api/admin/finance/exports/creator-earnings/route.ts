import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

// Creator annual earnings statement — required for income tax filings (EA-form
// equivalent for Malaysia, IR8A for Singapore, equivalent for other SEA
// jurisdictions). Format is a per-transaction ledger plus a summary block.
//
// GET /api/admin/finance/exports/creator-earnings?creatorId=...&year=2026
export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const creatorId = url.searchParams.get('creatorId')
  const yearParam = url.searchParams.get('year')
  if (!creatorId) return NextResponse.json({ error: 'creatorId query param required' }, { status: 400 })

  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()
  if (isNaN(year)) return NextResponse.json({ error: 'invalid year' }, { status: 400 })
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  const [creator, txs, payouts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true, email: true, name: true, legalFullName: true },
    }),
    prisma.transaction.findMany({
      where: {
        creatorId,
        createdAt: { gte: yearStart, lt: yearEnd },
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
        platformFee: true,
        creatorAmount: true,
        paymentRail: true,
        buyerCountry: true,
        currency: true,
      },
    }),
    prisma.payout.findMany({
      where: {
        creatorId,
        completedAt: { gte: yearStart, lt: yearEnd },
        status: 'PAID',
      },
      orderBy: { completedAt: 'asc' },
      select: {
        id: true,
        amountUsd: true,
        currency: true,
        completedAt: true,
        airwallexTransferId: true,
      },
    }),
  ])

  if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

  const grossUsd = txs.reduce((s, t) => s + t.grossAmountUsd, 0)
  const commissionUsd = txs.reduce((s, t) => s + (t.creatorCommissionUsd ?? t.platformFee ?? 0), 0)
  const netEarnedUsd = txs.reduce((s, t) => s + t.creatorAmount, 0)
  const totalPaidOutUsd = payouts.reduce((s, p) => s + p.amountUsd, 0)
  const accruedNotPaidUsd = netEarnedUsd - totalPaidOutUsd

  // Section 1: summary header
  const summaryLines = [
    `# Creator Annual Earnings Statement — Fiscal Year ${year}`,
    `# Hand to a registered tax agent in your jurisdiction.`,
    `#`,
    `# Creator: ${creator.name ?? '—'}`,
    `# Legal name: ${creator.legalFullName ?? '—'}`,
    `# Email: ${creator.email}`,
    `# Creator ID: ${creator.id}`,
    `# Period: ${yearStart.toISOString().slice(0, 10)} to ${new Date(yearEnd.getTime() - 1).toISOString().slice(0, 10)}`,
    `#`,
    `# Gross volume (USD cents): ${grossUsd}`,
    `# Platform commission (USD cents): ${commissionUsd}`,
    `# Net earned (USD cents): ${netEarnedUsd}`,
    `# Total paid out via Airwallex (USD cents): ${totalPaidOutUsd}`,
    `# Accrued but not yet paid (USD cents): ${accruedNotPaidUsd}`,
    `#`,
    `# Note: amounts in USD cents (multiply by 0.01 for dollars). For local-currency`,
    `# tax computations, apply the daily Airwallex FX rate from the transaction date.`,
    '',
  ]

  const txHeader = [
    'transaction_id',
    'order_id',
    'date_utc',
    'buyer_country',
    'payment_rail',
    'gross_usd_cents',
    'subtotal_usd_cents',
    'buyer_fee_usd_cents',
    'creator_commission_usd_cents',
    'creator_net_usd_cents',
  ].join(',')

  const txRows = txs.map(t => [
    t.id,
    t.orderId,
    t.createdAt.toISOString(),
    t.buyerCountry ?? '',
    t.paymentRail ?? '',
    t.grossAmountUsd,
    t.subtotalUsd ?? '',
    t.buyerFeeUsd ?? '',
    t.creatorCommissionUsd ?? t.platformFee,
    t.creatorAmount,
  ].join(','))

  const payoutHeader = [
    '',
    '# ── Payouts ───────────────────────────────────────────────────────────',
    'payout_id,date_utc,amount_usd_cents,currency,airwallex_transfer_id',
  ].join('\n')

  const payoutRows = payouts.map(p => [
    p.id,
    p.completedAt?.toISOString() ?? '',
    p.amountUsd,
    p.currency,
    p.airwallexTransferId ?? '',
  ].join(','))

  const csv = [
    ...summaryLines,
    '# ── Transactions ──────────────────────────────────────────────────────',
    txHeader,
    ...txRows,
    payoutHeader,
    ...payoutRows,
  ].join('\n')

  const safeName = (creator.email ?? creator.id).replace(/[^a-z0-9-]/gi, '_')
  const filename = `creator-earnings-${safeName}-${year}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
