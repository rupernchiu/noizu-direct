import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { packageDisputeEvidence } from '@/lib/dispute-evidence'
import { submitDisputeEvidence } from '@/lib/airwallex'

// GET /api/admin/chargebacks/[id]/evidence
// Returns the auto-packaged dispute evidence preview (Airwallex SubmitEvidence
// payload + human narrative + missing-items list) so the admin can review
// before submitting.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const evidence = await packageDisputeEvidence(id)
    return NextResponse.json(evidence)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

// POST /api/admin/chargebacks/[id]/evidence
// Body: { overrides?: Record<string, any> }
// Submits the auto-packaged evidence to Airwallex. Caller may pass `overrides`
// to merge into the payload (e.g. attach an admin-uploaded shipping doc URL).
// Logs an AdminAuditEvent with action='DISPUTE_EVIDENCE_SUBMITTED'.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => ({})) as {
    overrides?: Record<string, unknown>
  }

  try {
    const dispute = await prisma.chargebackDispute.findUnique({ where: { id } })
    if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

    const packaged = await packageDisputeEvidence(id)
    const finalPayload = { ...packaged.payload, ...(body.overrides ?? {}) }

    const result = await submitDisputeEvidence({
      disputeId: dispute.airwallexDisputeId,
      evidence: finalPayload,
    })

    const userId = (session.user as { id: string }).id
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = req.headers.get('user-agent') ?? null

    await prisma.adminAuditEvent.create({
      data: {
        actorId: userId,
        action: 'DISPUTE_EVIDENCE_SUBMITTED',
        resourceType: 'DISPUTE',
        resourceId: id,
        amountUsd: dispute.amountUsd,
        metadata: JSON.stringify({
          airwallexDisputeId: dispute.airwallexDisputeId,
          orderId: dispute.orderId,
          missingItems: packaged.missing,
          payloadKeys: Object.keys(finalPayload),
        }),
        ipAddress,
        userAgent,
      },
    })

    await prisma.chargebackDispute.update({
      where: { id },
      data: {
        status: 'UNDER_REVIEW',
        adminNotes: `[${new Date().toISOString()}] Evidence submitted by admin ${userId}. ` +
          `${packaged.missing.length > 0 ? `Missing: ${packaged.missing.join('; ')}` : 'All evidence available.'}`,
      },
    })

    return NextResponse.json({ ok: true, airwallexResponse: result })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
