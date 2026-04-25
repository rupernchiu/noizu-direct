import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

// GET /api/admin/fraud/queue
// Returns three actionable fraud-review streams:
//   1. Open chargebacks awaiting evidence (deadline-sorted)
//   2. Suspicious download patterns (>=3 distinct IPs OR >=cap on a single order in 24h)
//   3. High-velocity buyers (>=5 orders in 24h, sum > USD 500)
// All are read-only — admin actions go through the existing freeze/clawback/evidence endpoints.
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = Date.now()
  const day = new Date(now - 24 * 60 * 60 * 1000)

  // ── 1. Open chargebacks needing evidence ───────────────────────────────────
  const chargebacks = await prisma.chargebackDispute.findMany({
    where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
    orderBy: [{ evidenceDeadline: 'asc' }, { createdAt: 'desc' }],
    take: 50,
    include: {
      order: {
        select: {
          id: true,
          amountUsd: true,
          paymentRail: true,
          buyer: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true } },
          product: { select: { title: true, type: true } },
        },
      },
    },
  })

  // ── 2. Suspicious download patterns ────────────────────────────────────────
  // Group access logs by orderId in the last 24h, count distinct IPs.
  // SQL is more efficient here than client-side groupBy.
  const downloadIssues = await prisma.$queryRaw<Array<{
    orderId: string
    distinctIps: number
    accessCount: number
    lastAccessAt: Date
  }>>`
    SELECT "orderId",
           COUNT(DISTINCT "ipAddress")::int AS "distinctIps",
           COUNT(*)::int AS "accessCount",
           MAX("createdAt") AS "lastAccessAt"
    FROM "DownloadAccessLog"
    WHERE "createdAt" >= ${day}
      AND "outcome" IN ('DOWNLOADED', 'ISSUED')
      AND "ipAddress" IS NOT NULL
    GROUP BY "orderId"
    HAVING COUNT(DISTINCT "ipAddress") >= 3 OR COUNT(*) >= 8
    ORDER BY "distinctIps" DESC, "accessCount" DESC
    LIMIT 50
  `.catch(() => [] as Array<{ orderId: string; distinctIps: number; accessCount: number; lastAccessAt: Date }>)

  const downloadOrderIds = downloadIssues.map((r) => r.orderId)
  const downloadOrders = downloadOrderIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: downloadOrderIds } },
        select: {
          id: true,
          amountUsd: true,
          buyer: { select: { id: true, name: true, email: true } },
          product: { select: { title: true } },
        },
      })
    : []
  const downloadOrderById = new Map(downloadOrders.map((o) => [o.id, o]))
  const suspiciousDownloads = downloadIssues.map((r) => ({
    orderId: r.orderId,
    distinctIps: r.distinctIps,
    accessCount: r.accessCount,
    lastAccessAt: r.lastAccessAt,
    order: downloadOrderById.get(r.orderId) ?? null,
  }))

  // ── 3. High-velocity buyers ────────────────────────────────────────────────
  const velocity = await prisma.$queryRaw<Array<{
    buyerId: string
    orderCount: number
    sumAmountUsd: number
    distinctCreators: number
  }>>`
    SELECT "buyerId",
           COUNT(*)::int AS "orderCount",
           SUM("amountUsd")::int AS "sumAmountUsd",
           COUNT(DISTINCT "creatorId")::int AS "distinctCreators"
    FROM "Order"
    WHERE "createdAt" >= ${day}
      AND "status" IN ('PENDING', 'CONFIRMED', 'COMPLETED')
    GROUP BY "buyerId"
    HAVING COUNT(*) >= 5 AND SUM("amountUsd") >= 50000
    ORDER BY "sumAmountUsd" DESC
    LIMIT 25
  `.catch(() => [] as Array<{ buyerId: string; orderCount: number; sumAmountUsd: number; distinctCreators: number }>)

  const velocityIds = velocity.map((v) => v.buyerId)
  const velocityBuyers = velocityIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: velocityIds } },
        select: { id: true, name: true, email: true, createdAt: true },
      })
    : []
  const velocityById = new Map(velocityBuyers.map((u) => [u.id, u]))
  const highVelocity = velocity.map((v) => ({
    ...v,
    buyer: velocityById.get(v.buyerId) ?? null,
  }))

  return NextResponse.json({
    chargebacks: chargebacks.map((c) => ({
      id: c.id,
      airwallexDisputeId: c.airwallexDisputeId,
      orderId: c.orderId,
      amountUsd: c.amountUsd,
      reason: c.reason,
      status: c.status,
      evidenceDeadline: c.evidenceDeadline,
      createdAt: c.createdAt,
      order: c.order,
    })),
    suspiciousDownloads,
    highVelocity,
    generatedAt: new Date().toISOString(),
  })
}
