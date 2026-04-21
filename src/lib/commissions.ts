// Commission flow helpers — request/quote/milestone lifecycle shared logic.
// Terminology:
//   Request  → buyer-initiated intake (brief/references/budget). Not yet priced.
//   Quote    → creator-issued offer (amount + deposit or milestones + terms).
//   Milestone→ one slice of a milestone-based quote. Paid upfront, released per phase.
//   Order    → the live escrow record once the buyer accepts + pays a quote.
//
// Invariants:
//   - A quote's milestones[].amountUsd sum MUST equal the quote's amountUsd.
//   - When a milestone-based quote is accepted, milestones are copied onto the Order
//     and each becomes its own release unit (full order amount stays in escrow).
//   - Non-milestone quotes follow the existing two-phase deposit/balance flow already
//     wired on Order (commissionDepositPercent/Amount), so no special handling needed
//     downstream — the regular escrow-processor + releaseEscrow path works as-is.

import { prisma } from '@/lib/prisma'

export const COMMISSION_REQUEST_TTL_DAYS = 7
export const COMMISSION_QUOTE_TTL_DAYS   = 7
export const MILESTONE_AUTO_RELEASE_DAYS = 14

/**
 * Validate a proposed quote payload. Returns an error string or null when valid.
 * Milestone sum must match amount; amount/turnaround/deposit within sane ranges.
 */
export function validateQuote(input: {
  amountUsd: number
  depositPercent: number
  revisionsIncluded: number
  turnaroundDays: number
  isMilestoneBased: boolean
  milestones?: { title: string; amountUsd: number }[]
}): string | null {
  if (input.amountUsd < 100)     return 'Amount must be at least $1.00'
  if (input.amountUsd > 2_000_000) return 'Amount is too large'
  if (input.depositPercent < 0 || input.depositPercent > 100) return 'Deposit % must be 0–100'
  if (input.revisionsIncluded < 0 || input.revisionsIncluded > 20) return 'Revisions must be 0–20'
  if (input.turnaroundDays < 1 || input.turnaroundDays > 365) return 'Turnaround must be 1–365 days'

  if (input.isMilestoneBased) {
    const ms = input.milestones ?? []
    if (ms.length < 2) return 'Milestone-based quotes need at least 2 milestones'
    if (ms.length > 10) return 'Maximum 10 milestones'
    const sum = ms.reduce((s, m) => s + m.amountUsd, 0)
    if (sum !== input.amountUsd) return `Milestone amounts ($${(sum/100).toFixed(2)}) must sum to quote total ($${(input.amountUsd/100).toFixed(2)})`
    if (ms.some(m => !m.title.trim())) return 'Every milestone needs a title'
    if (ms.some(m => m.amountUsd < 100)) return 'Each milestone must be at least $1.00'
  }
  return null
}

/**
 * Create the hidden backing Product for a quote-based Order.
 * Quote orders don't have a public SKU, but Order.productId is required — so we mint
 * an inactive Product tagged with the quote's title. Never listed; only referenced
 * by the single Order it backs.
 */
export async function createQuoteBackingProduct(params: {
  creatorProfileId: string
  title: string
  amountUsd: number
  depositPercent: number
  revisionsIncluded: number
  turnaroundDays: number
}) {
  return prisma.product.create({
    data: {
      creatorId: params.creatorProfileId,
      title: `[Quote] ${params.title}`.slice(0, 200),
      description: 'Auto-generated backing SKU for a custom commission quote. Not publicly listed.',
      price: params.amountUsd,
      category: 'commission',
      type: 'COMMISSION',
      isActive: false,
      commissionDepositPercent: params.depositPercent,
      commissionRevisionsIncluded: params.revisionsIncluded,
      commissionTurnaroundDays: params.turnaroundDays,
    },
    select: { id: true },
  })
}

/** Returns which Order statuses indicate the commission is still live (not terminal). */
export function isCommissionInFlight(commissionStatus: string | null): boolean {
  if (!commissionStatus) return false
  return ['PENDING_ACCEPTANCE', 'ACCEPTED', 'DELIVERED', 'REVISION_REQUESTED'].includes(commissionStatus)
}

/**
 * Compute how much of a milestone-based order's escrow is still locked up
 * (i.e. milestones not yet released).
 */
export function computeRemainingEscrow(milestones: { amountUsd: number; releasedAt: Date | null }[]): number {
  return milestones.filter(m => !m.releasedAt).reduce((s, m) => s + m.amountUsd, 0)
}
