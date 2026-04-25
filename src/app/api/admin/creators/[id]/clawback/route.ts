import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { applyClawback } from '@/lib/creator-balance'

// POST /api/admin/creators/[id]/clawback
// Body: { amountUsd, reason, orderId? }
// Admin-approved clawback against a creator's balance. Logs an AdminAuditEvent
// with action='CLAWBACK_APPLIED'. If insufficient available balance, the
// creator's payouts are frozen with the deficit captured in payoutFrozenReason.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: creatorId } = await params

  const body = await req.json().catch(() => ({})) as {
    amountUsd?: number
    reason?: string
    orderId?: string
  }
  if (!body.amountUsd || body.amountUsd <= 0) {
    return NextResponse.json({ error: 'amountUsd must be a positive integer (cents)' }, { status: 400 })
  }
  if (!body.reason || body.reason.trim().length < 5) {
    return NextResponse.json({ error: 'reason is required (min 5 chars)' }, { status: 400 })
  }

  const userId = (session.user as { id: string }).id
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  try {
    const result = await applyClawback({
      creatorId,
      amountUsd: body.amountUsd,
      orderId: body.orderId,
      reason: body.reason.trim(),
      approvedBy: userId,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
