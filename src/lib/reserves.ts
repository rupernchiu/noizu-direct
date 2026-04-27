/**
 * Reserve ledger helpers (sprint 0.7).
 *
 * Auto-compute pattern: cron-driven accruals deposit into a PlatformReserve.
 * Releases require admin approval (creates an AdminAuditEvent for traceability).
 *
 * All amounts in USD cents to match the rest of the schema.
 */
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'

export type ReserveKind =
  | 'FRAUD_ROLLING'
  | 'MARKETING'
  | 'TAX_DESTINATION'
  | 'TAX_CREATOR_WITHHOLDING'
  // Phase 4 (2026-04-27) — Layer 1 origin-tax holding bucket. Per-country scope
  // (e.g. scope='ID' for Indonesia PPh Final 0.5%). Accrued at Transaction
  // create time in the Airwallex webhook from `Order.creatorTaxAmountUsd`;
  // drained when admin remits to the creator's tax authority.
  | 'TAX_ORIGIN'
  | 'REFUND_FLOAT'

// Default policy rates (admin can override per reserve in PlatformReserve.notes
// or migrate to PlatformSettings later — keep here for now to avoid yet another
// settings field per scope).
export const RESERVE_POLICIES = {
  FRAUD_ROLLING_RATE: 0.07, // 7% of monthly platform fees
  FRAUD_ROLLING_HOLD_DAYS: 180,
  MARKETING_RATE: 0.02, // 2% of GMV
  REFUND_FLOAT_RATE: 0.005, // 0.5% of GMV
} as const

/**
 * Get-or-create a reserve. Idempotent — safe to call from cron on every run.
 */
export async function ensureReserve(opts: {
  kind: ReserveKind
  scope?: string | null
  label: string
  policyHoldDays?: number | null
  targetUsd?: number | null
}) {
  const { kind, scope = null, label, policyHoldDays = null, targetUsd = null } = opts
  const existing = await prisma.platformReserve.findUnique({
    where: { kind_scope: { kind, scope: scope as string } },
  }).catch(() => null)
  if (existing) return existing
  return prisma.platformReserve.create({
    data: { kind, scope, label, policyHoldDays, targetUsd },
  })
}

/**
 * Record an accrual (cron-driven deposit). Updates the cached cumulative + balance.
 * Wrap caller in a transaction if multiple reserves move atomically.
 */
export async function recordAccrual(opts: {
  reserveId: string
  amountUsd: number
  reason: string
  refOrderId?: string
  refPayoutId?: string
  refUserId?: string
  tx?: Prisma.TransactionClient
}) {
  const { reserveId, amountUsd, reason, refOrderId, refPayoutId, refUserId, tx } = opts
  if (amountUsd <= 0) return null
  const client = tx ?? prisma
  const [entry] = await Promise.all([
    client.platformReserveEntry.create({
      data: {
        reserveId,
        direction: 'ACCRUAL',
        amountUsd,
        reason,
        refOrderId,
        refPayoutId,
        refUserId,
      },
    }),
    client.platformReserve.update({
      where: { id: reserveId },
      data: {
        cumulativeInUsd: { increment: amountUsd },
        balanceUsd: { increment: amountUsd },
      },
    }),
  ])
  return entry
}

/**
 * Record an admin-approved release. Caller must have already validated authority
 * (admin guard) before invoking. Logs to AdminAuditEvent for compliance.
 */
export async function recordRelease(opts: {
  reserveId: string
  amountUsd: number
  reason: string
  approvedBy: string
  ipAddress?: string
  userAgent?: string
}) {
  const { reserveId, amountUsd, reason, approvedBy, ipAddress, userAgent } = opts
  if (amountUsd <= 0) throw new Error('Release amount must be positive')

  return prisma.$transaction(async (tx) => {
    const reserve = await tx.platformReserve.findUnique({ where: { id: reserveId } })
    if (!reserve) throw new Error(`Reserve ${reserveId} not found`)
    if (reserve.balanceUsd < amountUsd) {
      throw new Error(`Insufficient reserve balance: have ${reserve.balanceUsd}, need ${amountUsd}`)
    }
    const entry = await tx.platformReserveEntry.create({
      data: {
        reserveId,
        direction: 'RELEASE',
        amountUsd,
        reason,
        approvedBy,
        approvedAt: new Date(),
      },
    })
    await tx.platformReserve.update({
      where: { id: reserveId },
      data: {
        cumulativeOutUsd: { increment: amountUsd },
        balanceUsd: { decrement: amountUsd },
      },
    })
    await tx.adminAuditEvent.create({
      data: {
        actorId: approvedBy,
        action: 'RESERVE_RELEASED',
        resourceType: 'RESERVE',
        resourceId: reserveId,
        amountUsd,
        metadata: JSON.stringify({ reason, reserveKind: reserve.kind, reserveScope: reserve.scope }),
        ipAddress,
        userAgent,
      },
    })
    return entry
  })
}

/**
 * Daily fraud-reserve accrual. Computes 7% of platform fees (creator commission +
 * legacy platform fee) earned in the trailing day's window and deposits it.
 *
 * Idempotency: keyed off `reason` containing the day stamp. Caller (cron) is
 * responsible for not re-running for the same day.
 */
export async function accrueFraudReserveForDay(dayStart: Date, dayEnd: Date) {
  const reserve = await ensureReserve({
    kind: 'FRAUD_ROLLING',
    label: 'Fraud / chargeback rolling reserve',
    policyHoldDays: RESERVE_POLICIES.FRAUD_ROLLING_HOLD_DAYS,
  })
  const txAgg = await prisma.transaction.aggregate({
    where: { createdAt: { gte: dayStart, lt: dayEnd } },
    _sum: { platformFee: true, creatorCommissionUsd: true },
  })
  const platformRevenue =
    (txAgg._sum.platformFee ?? 0) + (txAgg._sum.creatorCommissionUsd ?? 0)
  const accrual = Math.round(platformRevenue * RESERVE_POLICIES.FRAUD_ROLLING_RATE)
  if (accrual <= 0) return null
  return recordAccrual({
    reserveId: reserve.id,
    amountUsd: accrual,
    reason: `Daily fraud accrual ${dayStart.toISOString().slice(0, 10)} (7% of $${(platformRevenue / 100).toFixed(2)} platform fees)`,
  })
}

/**
 * Daily marketing-reserve accrual. 2% of GMV.
 */
export async function accrueMarketingReserveForDay(dayStart: Date, dayEnd: Date) {
  const reserve = await ensureReserve({
    kind: 'MARKETING',
    label: 'Marketing / growth budget',
  })
  const gmvAgg = await prisma.transaction.aggregate({
    where: { createdAt: { gte: dayStart, lt: dayEnd } },
    _sum: { grossAmountUsd: true },
  })
  const gmv = gmvAgg._sum.grossAmountUsd ?? 0
  const accrual = Math.round(gmv * RESERVE_POLICIES.MARKETING_RATE)
  if (accrual <= 0) return null
  return recordAccrual({
    reserveId: reserve.id,
    amountUsd: accrual,
    reason: `Daily marketing accrual ${dayStart.toISOString().slice(0, 10)} (2% of $${(gmv / 100).toFixed(2)} GMV)`,
  })
}

/**
 * Phase 4 — Layer 1 origin-tax accrual (per-order).
 *
 * Called from the Airwallex webhook when a Transaction is created for an order
 * whose `creatorTaxAmountUsd` is non-zero (Indonesia PPh Final at launch).
 * Idempotency comes from the caller: the webhook's order-claim updateMany
 * guarantees a single COMPLETED Transaction per order, so this helper can be
 * invoked unconditionally inside that flow.
 *
 * Pass an existing transaction client to chain into the same DB transaction
 * as the Transaction.create() — keeps the reserve and the ledger in sync
 * even if a later step in the same handler fails.
 */
export async function accrueOriginTaxForOrder(opts: {
  creatorCountry: string
  amountUsd: number
  orderId: string
  creatorId?: string
  tx?: Prisma.TransactionClient
}) {
  const { creatorCountry, amountUsd, orderId, creatorId, tx } = opts
  if (amountUsd <= 0 || !creatorCountry) return null
  const scope = creatorCountry.toUpperCase()
  // ensureReserve currently uses the global prisma client (it lives outside
  // the caller's tx context). Reserves are upserted; the accrual is the only
  // mutation that needs to participate in the caller's transaction.
  const reserve = await ensureReserve({
    kind: 'TAX_ORIGIN',
    scope,
    label: `Origin tax (${scope}) — withheld from creator payouts`,
  })
  return recordAccrual({
    reserveId: reserve.id,
    amountUsd,
    reason: `PPh withholding on order ${orderId} (${scope})`,
    refOrderId: orderId,
    refUserId: creatorId,
    tx,
  })
}

/**
 * Per-country tax accrual. Reads PerCountryTaxConfig (if present in PlatformSettings)
 * or falls back to the standard SEA rates baked in here. Only accrues if the
 * country has crossed its registration threshold.
 */
type CountryTaxRule = {
  country: string
  thresholdLocal: number // local-currency cents
  ratePercent: number
  label: string
}

export const SEA_TAX_RULES: CountryTaxRule[] = [
  { country: 'MY', thresholdLocal: 500_000_00, ratePercent: 8, label: 'MY SST' },
  { country: 'SG', thresholdLocal: 100_000_00, ratePercent: 9, label: 'SG GST' },
  { country: 'ID', thresholdLocal: 600_000_000_00, ratePercent: 11, label: 'ID PPN' },
  { country: 'TH', thresholdLocal: 1_800_000_00, ratePercent: 7, label: 'TH VAT' },
  { country: 'PH', thresholdLocal: 3_000_000_00, ratePercent: 12, label: 'PH VAT' },
]

/**
 * Aggregate balances across all reserves for a quick treasury overview.
 */
export async function getReserveSummary() {
  const reserves = await prisma.platformReserve.findMany({
    where: { isActive: true },
    orderBy: [{ kind: 'asc' }, { scope: 'asc' }],
  })
  return reserves.map((r) => ({
    id: r.id,
    kind: r.kind,
    scope: r.scope,
    label: r.label,
    balanceUsd: r.balanceUsd,
    cumulativeInUsd: r.cumulativeInUsd,
    cumulativeOutUsd: r.cumulativeOutUsd,
    targetUsd: r.targetUsd,
    policyHoldDays: r.policyHoldDays,
  }))
}
