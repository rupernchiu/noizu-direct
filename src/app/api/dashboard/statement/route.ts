import { NextRequest, NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

const FX_CACHE: Record<string, { rate: number; fetchedAt: number }> = {}
const FX_TTL = 60 * 60 * 1000

async function getRate(to: string): Promise<number> {
  if (to === 'USD') return 1
  const cached = FX_CACHE[to]
  if (cached && Date.now() - cached.fetchedAt < FX_TTL) return cached.rate
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${to}`)
    if (!res.ok) return 1
    const data = await res.json() as { rates: Record<string, number> }
    const rate = data.rates[to] ?? 1
    FX_CACHE[to] = { rate, fetchedAt: Date.now() }
    return rate
  } catch { return 1 }
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const { searchParams } = new URL(req.url)
  const displayCurrency = (searchParams.get('currency') ?? 'USD').toUpperCase()

  // Load creator profile for payout currency
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { payoutCurrency: true },
  })
  const payoutCurrency = profile?.payoutCurrency ?? 'USD'

  const targetCurrency = displayCurrency === 'PAYOUT' ? payoutCurrency : displayCurrency
  const rate = await getRate(targetCurrency)
  const isZeroDecimal = ['IDR', 'JPY', 'KRW', 'VND'].includes(targetCurrency)

  function convertCents(usdCents: number): number {
    const major = (usdCents / 100) * rate
    return isZeroDecimal ? Math.round(major) : Math.round(major * 100)
  }

  // Fetch all transactions for this creator
  const transactions = await prisma.transaction.findMany({
    where: { creatorId: userId },
    include: {
      order: {
        select: {
          id: true,
          cartSessionId: true,
          displayCurrency: true,
          displayAmount: true,
          productId: true,
          createdAt: true,
          status: true,
          product: { select: { title: true, type: true } },
          buyer: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch payouts
  const payouts = await prisma.payout.findMany({
    where: { creatorId: userId },
    orderBy: { requestedAt: 'desc' },
  })

  // Group transactions by month
  type MonthData = {
    month: string
    label: string
    availableUsd: number
    escrowUsd: number
    grossUsd: number
    platformFeeUsd: number
    orders: {
      orderId: string
      productTitle: string
      productType: string
      buyerName: string | null
      date: string
      status: string
      grossUsd: number
      platformFeeUsd: number
      netUsd: number
    }[]
    payouts: { id: string; amountUsd: number; status: string; date: string; currency: string }[]
  }

  const monthMap = new Map<string, MonthData>()

  for (const tx of transactions) {
    const key = toMonthKey(tx.createdAt)
    if (!monthMap.has(key)) {
      const [year, month] = key.split('-')
      const label = new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString('en', { month: 'long', year: 'numeric' })
      monthMap.set(key, {
        month: key,
        label,
        availableUsd: 0,
        escrowUsd: 0,
        grossUsd: 0,
        platformFeeUsd: 0,
        orders: [],
      } as any)
    }
    const m = monthMap.get(key)!

    m.grossUsd += tx.grossAmountUsd
    m.platformFeeUsd += tx.platformFee + tx.processingFee

    if (tx.status === 'COMPLETED') m.availableUsd += tx.creatorAmount
    else if (tx.status === 'ESCROW') m.escrowUsd += tx.creatorAmount

    m.orders.push({
      orderId: tx.order.id,
      productTitle: tx.order.product?.title ?? 'Unknown',
      productType: tx.order.product?.type ?? 'UNKNOWN',
      buyerName: tx.order.buyer?.name ?? null,
      date: tx.createdAt.toISOString(),
      status: tx.status,
      grossUsd: tx.grossAmountUsd,
      platformFeeUsd: tx.platformFee + tx.processingFee,
      netUsd: tx.creatorAmount,
    })
  }

  // Add payouts to their month
  for (const payout of payouts) {
    const key = toMonthKey(payout.requestedAt)
    if (!monthMap.has(key)) {
      const [year, month] = key.split('-')
      const label = new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString('en', { month: 'long', year: 'numeric' })
      monthMap.set(key, { month: key, label, availableUsd: 0, escrowUsd: 0, grossUsd: 0, platformFeeUsd: 0, orders: [], payouts: [] } as any)
    }
    const m = monthMap.get(key)! as any
    if (!m.payouts) m.payouts = []
    m.payouts.push({
      id: payout.id,
      amountUsd: payout.amountUsd,
      status: payout.status,
      date: payout.requestedAt.toISOString(),
      currency: payout.currency,
    })
  }

  // Totals across all time
  const totalAvailableUsd = transactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((s, t) => s + t.creatorAmount, 0)
  const totalEscrowUsd = transactions
    .filter(t => t.status === 'ESCROW')
    .reduce((s, t) => s + t.creatorAmount, 0)
  const totalPaidOutUsd = payouts
    .filter(p => p.status === 'PAID')
    .reduce((s, p) => s + p.amountUsd, 0)

  // Sort months newest first
  const months = Array.from(monthMap.values())
    .sort((a, b) => b.month.localeCompare(a.month))
    .map(m => ({
      ...m,
      available: convertCents(m.availableUsd),
      escrow: convertCents(m.escrowUsd),
      gross: convertCents(m.grossUsd),
      platformFee: convertCents(m.platformFeeUsd),
      orders: m.orders.map((o: any) => ({
        ...o,
        gross: convertCents(o.grossUsd),
        platformFee: convertCents(o.platformFeeUsd),
        net: convertCents(o.netUsd),
      })),
      payouts: ((m as any).payouts ?? []).map((p: any) => ({
        ...p,
        amount: convertCents(p.amountUsd),
      })),
    }))

  return NextResponse.json({
    currency: targetCurrency,
    payoutCurrency,
    isZeroDecimal,
    rate,
    totals: {
      available: convertCents(totalAvailableUsd),
      availableUsd: totalAvailableUsd,
      escrow: convertCents(totalEscrowUsd),
      escrowUsd: totalEscrowUsd,
      paidOut: convertCents(totalPaidOutUsd),
      paidOutUsd: totalPaidOutUsd,
    },
    months,
  })
}
