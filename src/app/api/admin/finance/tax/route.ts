import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { TAX_JURISDICTIONS, thresholdStatus } from '@/lib/tax-thresholds'

// Per-country tax compliance dashboard data.
// Reads sprint 0.1's `buyerCountry` field to compute YTD GMV per country, then
// stamps it against TAX_JURISDICTIONS thresholds for traffic-light status.
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const yearStart = new Date(new Date().getFullYear(), 0, 1)

  const [perCountryYtd, perCreatorYtd] = await Promise.all([
    prisma.$queryRaw<{ country: string | null; gmv: bigint; orders: bigint }[]>`
      SELECT
        "buyerCountry"        AS country,
        SUM("grossAmountUsd") AS gmv,
        COUNT(*)              AS orders
      FROM "Transaction"
      WHERE "createdAt" >= ${yearStart}
        AND "status" IN ('COMPLETED', 'ESCROW', 'PAID')
      GROUP BY "buyerCountry"
      ORDER BY gmv DESC NULLS LAST
    `.catch(() => []),
    // Per-creator YTD earnings (subtotal - commission) — feeds the creator tax view
    prisma.$queryRaw<{ creator_id: string; creator_email: string | null; gross: bigint; commission: bigint; net: bigint; orders: bigint }[]>`
      SELECT
        t."creatorId"               AS creator_id,
        u."email"                   AS creator_email,
        SUM(t."grossAmountUsd")     AS gross,
        SUM(COALESCE(t."creatorCommissionUsd", t."platformFee")) AS commission,
        SUM(t."creatorAmount")      AS net,
        COUNT(*)                    AS orders
      FROM "Transaction" t
      LEFT JOIN "User" u ON u."id" = t."creatorId"
      WHERE t."createdAt" >= ${yearStart}
        AND t."status" IN ('COMPLETED', 'ESCROW', 'PAID')
      GROUP BY t."creatorId", u."email"
      ORDER BY net DESC NULLS LAST
      LIMIT 100
    `.catch(() => []),
  ])

  const countryRows = TAX_JURISDICTIONS.map((j) => {
    const found = perCountryYtd.find((r) => r.country === j.country)
    const gmvUsd = Number(found?.gmv ?? 0)
    const orders = Number(found?.orders ?? 0)
    const status = thresholdStatus(j.country, gmvUsd)
    return {
      country: j.country,
      countryName: j.countryName,
      taxLabel: j.taxLabel,
      currency: j.currency,
      thresholdLocalCents: j.thresholdLocalCents,
      ratePercent: j.ratePercent,
      filingFormHint: j.filingFormHint,
      gmvUsdCents: gmvUsd,
      gmvLocalCents: status?.gmvLocalCents ?? 0,
      orders,
      ratio: status?.ratio ?? 0,
      status: status?.status ?? 'TRACKING',
    }
  })

  const unknownCountryGmv = perCountryYtd
    .filter((r) => !r.country || !TAX_JURISDICTIONS.some((j) => j.country === r.country))
    .reduce((sum, r) => sum + Number(r.gmv ?? 0), 0)

  return NextResponse.json({
    fiscalYearStart: yearStart.toISOString(),
    perCountry: countryRows,
    unknownCountryGmvUsd: unknownCountryGmv,
    perCreator: perCreatorYtd.map((r) => ({
      creatorId: r.creator_id,
      email: r.creator_email,
      grossUsd: Number(r.gross ?? 0),
      commissionUsd: Number(r.commission ?? 0),
      netUsd: Number(r.net ?? 0),
      orders: Number(r.orders ?? 0),
    })),
  })
}
