import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminId = (session.user as any).id as string
  const { id } = await params

  const body = await req.json() as {
    action: 'approve' | 'paid' | 'reject'
    rejectionReason?: string
  }
  const { action, rejectionReason } = body

  if (!['approve', 'paid', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (action === 'reject' && !rejectionReason?.trim()) {
    return NextResponse.json({ error: 'rejectionReason is required for reject action' }, { status: 400 })
  }

  const existing = await prisma.payout.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

  let payout: typeof existing
  let emailSubject: string
  let emailHtml: string
  let emailType: string

  const amountDisplay = `RM ${(existing.amountUsd / 100).toFixed(2)}`

  if (action === 'approve') {
    payout = await prisma.payout.update({
      where: { id },
      data: { status: 'APPROVED' },
    })
    emailSubject = 'Your payout request has been approved'
    emailHtml = `<p>Good news! Your payout request has been approved and is being processed.</p><p>Amount: ${amountDisplay}</p><p>— NOIZU DIRECT</p>`
    emailType = 'payout_approved'
  } else if (action === 'paid') {
    payout = await prisma.payout.update({
      where: { id },
      data: { status: 'PAID', processedAt: new Date(), completedAt: new Date() },
    })
    emailSubject = 'Your payout has been sent'
    emailHtml = `<p>Your payout of ${amountDisplay} has been sent to your account.</p><p>Please allow 1–3 business days for the funds to arrive.</p><p>— NOIZU DIRECT</p>`
    emailType = 'payout_paid'
  } else {
    // reject
    payout = await prisma.payout.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: rejectionReason!.trim(),
      },
    })
    emailSubject = 'Your payout request was rejected'
    emailHtml = `<p>Unfortunately, your payout request was rejected.</p><p>Reason: ${rejectionReason}</p><p>If you have questions, please contact support.</p><p>— NOIZU DIRECT</p>`
    emailType = 'payout_rejected'
  }

  // Log audit event
  await prisma.auditEvent.create({
    data: {
      actorId: adminId,
      actorName: 'Admin',
      action: `payouts.${action}`,
      entityType: 'Payout',
      entityId: id,
      reason: rejectionReason ?? null,
      entityLabel: amountDisplay,
    },
  })

  // Send email to creator
  const creator = await prisma.user.findUnique({
    where: { id: existing.creatorId },
    select: { email: true, name: true },
  })

  if (creator?.email) {
    const email = creator.email
    try {
      const { data } = await resend.emails.send({
        from: 'NOIZU-DIRECT <noreply@noizu.direct>',
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      })
      await prisma.emailLog.create({
        data: { to: email, subject: emailSubject, type: emailType, status: 'sent', resendId: data?.id ?? null },
      })
    } catch (e) {
      await prisma.emailLog.create({
        data: { to: email, subject: emailSubject, type: emailType, status: 'failed', error: String(e) },
      }).catch(() => {})
    }
  }

  return NextResponse.json(payout)
}
