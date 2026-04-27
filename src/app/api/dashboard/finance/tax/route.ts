/**
 * GET /api/dashboard/finance/tax
 *
 * Phase 5 — creator-facing tax & earnings statement.
 *
 * Aggregates a creator's orders for a given period and returns the structured
 * sections defined in the tax architecture spec (§12.2). All amounts are USD
 * cents — the client formats display.
 *
 * Auth: creator only (requireCreatorProfile).
 *
 * Query params (zod-validated):
 *   from?  ISO date  -|
 *   to?    ISO date  -|  if both omitted, defaults to current calendar year.
 *   month? 1..12     -|  When `month` AND `year` are both provided, they take
 *   year?  number    -|  precedence over from/to (covers "show me Aug 2026").
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireCreatorProfile, unauthorized } from '@/lib/guards'
import { computeTaxStatement, parseTaxStatementParams } from '@/lib/tax-statement'

export async function GET(req: NextRequest) {
  const ctx = await requireCreatorProfile()
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const parsed = parseTaxStatementParams(url.searchParams)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const data = await computeTaxStatement(ctx.userId, ctx.profile, parsed.data)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[dashboard/finance/tax] error', err)
    return NextResponse.json({ error: 'Failed to compute statement' }, { status: 500 })
  }
}

