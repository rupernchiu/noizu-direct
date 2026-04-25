import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

// Strategic / management insights — P&L decomposition, margin by rail,
// concentration risk, refund rate by product type. Reads sprint 0.1 fields.
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const yearStart = new Date(new Date().getFullYear(), 0, 1)

  const [
    pnlAgg,
    perRail,
    perCreator,
    chargebackTotal,
    refundsByProductType,
    grossYtd,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { createdAt: { gte: yearStart } },
      _sum: {
        grossAmountUsd: true,
        subtotalUsd: true,
        buyerFeeUsd: true,
        creatorCommissionUsd: true,
        platformFee: true,
        processingFee: true,
        creatorAmount: true,
      },
    }),
    prisma.$queryRaw<{ rail: string | null; gross: bigint; buyer_fee: bigint | null; creator_commission: bigint | null; orders: bigint }[]>`
      SELECT
        "paymentRail"               AS rail,
        SUM("grossAmountUsd")       AS gross,
        SUM("buyerFeeUsd")          AS buyer_fee,
        SUM("creatorCommissionUsd") AS creator_commission,
        COUNT(*)                    AS orders
      FROM "Transaction"
      WHERE "createdAt" >= ${yearStart}
      GROUP BY "paymentRail"
      ORDER BY gross DESC NULLS LAST
    `.catch(() => []),
    prisma.$queryRaw<{ creator_id: string; email: string | null; gross: bigint; orders: bigint }[]>`
      SELECT
        t."creatorId" AS creator_id,
        u."email"     AS email,
        SUM(t."grossAmountUsd") AS gross,
        COUNT(*)      AS orders
      FROM "Transaction" t
      LEFT JOIN "User" u ON u."id" = t."creatorId"
      WHERE t."createdAt" >= ${yearStart}
      GROUP BY t."creatorId", u."email"
      ORDER BY gross DESC
      LIMIT 30
    `.catch(() => []),
    prisma.chargebackDispute.aggregate({
      where: { createdAt: { gte: yearStart } },
      _sum: { amountUsd: true },
      _count: true,
    }),
    prisma.$queryRaw<{ product_type: string | null; refund_count: bigint; total_orders: bigint }[]>`
      SELECT
        p."productType" AS product_type,
        SUM(CASE WHEN o."status" = 'REFUNDED' THEN 1 ELSE 0 END)::bigint AS refund_count,
        COUNT(*)::bigint AS total_orders
      FROM "Order" o
      LEFT JOIN "Product" p ON p."id" = o."productId"
      WHERE o."createdAt" >= ${yearStart}
      GROUP BY p."productType"
    `.catch(() => []),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: yearStart } },
      _sum: { grossAmountUsd: true },
    }),
  ])

  const ytdGross = grossYtd._sum.grossAmountUsd ?? 0
  const totalCreators = perCreator.length
  const top1 = perCreator[0]
  const top5Sum = perCreator.slice(0, 5).reduce((s, r) => s + Number(r.gross ?? 0), 0)
  const top20Sum = perCreator.slice(0, 20).reduce((s, r) => s + Number(r.gross ?? 0), 0)

  // Concentration metrics
  const concentration = {
    top1Pct: ytdGross > 0 && top1 ? (Number(top1.gross) / ytdGross) * 100 : 0,
    top5Pct: ytdGross > 0 ? (top5Sum / ytdGross) * 100 : 0,
    top20Pct: ytdGross > 0 ? (top20Sum / ytdGross) * 100 : 0,
    totalCreators,
    top1: top1 ? {
      creatorId: top1.creator_id,
      email: top1.email,
      grossUsd: Number(top1.gross ?? 0),
      orders: Number(top1.orders ?? 0),
    } : null,
  }

  return NextResponse.json({
    fiscalYearStart: yearStart.toISOString(),
    pnl: {
      grossUsd: pnlAgg._sum.grossAmountUsd ?? 0,
      subtotalUsd: pnlAgg._sum.subtotalUsd ?? 0,
      buyerFeeUsd: pnlAgg._sum.buyerFeeUsd ?? 0,
      creatorCommissionUsd: pnlAgg._sum.creatorCommissionUsd ?? 0,
      legacyProcessingFeeUsd: pnlAgg._sum.processingFee ?? 0,
      legacyPlatformFeeUsd: pnlAgg._sum.platformFee ?? 0,
      creatorPayoutUsd: pnlAgg._sum.creatorAmount ?? 0,
      chargebackLossUsd: chargebackTotal._sum.amountUsd ?? 0,
      chargebackCount: chargebackTotal._count,
    },
    perRail: perRail.map(r => ({
      rail: r.rail,
      grossUsd: Number(r.gross ?? 0),
      buyerFeeUsd: Number(r.buyer_fee ?? 0),
      creatorCommissionUsd: Number(r.creator_commission ?? 0),
      orders: Number(r.orders ?? 0),
    })),
    concentration,
    refundsByProductType: refundsByProductType.map(r => ({
      productType: r.product_type,
      refundCount: Number(r.refund_count ?? 0),
      totalOrders: Number(r.total_orders ?? 0),
      refundRatePct: Number(r.total_orders ?? 0) > 0
        ? (Number(r.refund_count ?? 0) / Number(r.total_orders ?? 0)) * 100
        : 0,
    })),
  })
}
