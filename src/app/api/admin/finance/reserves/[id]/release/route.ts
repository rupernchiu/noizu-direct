import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { recordRelease } from '@/lib/reserves'

// POST /api/admin/finance/reserves/[id]/release
// Body: { amountUsd, reason }
// Admin-only. Logs an AdminAuditEvent for compliance traceability.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => ({})) as { amountUsd?: number; reason?: string }
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
    const entry = await recordRelease({
      reserveId: id,
      amountUsd: body.amountUsd,
      reason: body.reason.trim(),
      approvedBy: userId,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    })
    return NextResponse.json({ ok: true, entry })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
