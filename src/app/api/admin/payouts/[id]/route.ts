import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { Resend } from 'resend'
import { executeTransfer } from '@/lib/airwallex'
import { executePayPalPayout } from '@/lib/paypal'

const KEY = Buffer.from(
  (process.env.PAYOUT_ENCRYPTION_KEY ?? 'placeholder_32_char_encryption_key').padEnd(32, '0').slice(0, 32)
)
function decrypt(text: string): string {
  try {
    const [ivHex, encHex] = text.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const enc = Buffer.from(encHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch { return '' }
}

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
    // Fetch creator profile for payout method details
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: existing.creatorId },
      select: { payoutMethod: true, airwallexBeneficiaryId: true, payoutDetails: true, payoutCurrency: true },
    })

    let transferId: string | null = null

    if (creatorProfile?.payoutMethod === 'paypal' && creatorProfile.payoutDetails) {
      const details = JSON.parse(decrypt(creatorProfile.payoutDetails)) as { paypalEmail?: string }
      if (!details.paypalEmail) {
        return NextResponse.json({ error: 'Creator PayPal email is not configured' }, { status: 400 })
      }
      const result = await executePayPalPayout({
        payoutId: existing.id,
        paypalEmail: details.paypalEmail,
        amount: existing.amountUsd,
        currency: creatorProfile.payoutCurrency ?? 'USD',
      })
      transferId = result.batch_id
    } else if (creatorProfile?.airwallexBeneficiaryId) {
      const result = await executeTransfer({
        beneficiaryId: creatorProfile.airwallexBeneficiaryId,
        amount: existing.amountUsd,
        currency: creatorProfile.payoutCurrency ?? 'MYR',
        payoutId: existing.id,
      })
      transferId = result.transfer_id ?? result.id ?? null
    } else {
      return NextResponse.json({ error: 'Creator has no payout method configured' }, { status: 400 })
    }

    payout = await prisma.payout.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        processedAt: new Date(),
        ...(transferId ? { airwallexTransferId: transferId } : {}),
      },
    })
    emailSubject = 'Your payout is being processed'
    emailHtml = `<p>Your payout of ${amountDisplay} is being processed and will arrive within 1–3 business days.</p><p>— NOIZU DIRECT</p>`
    emailType = 'payout_processing'
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
      reason: action === 'paid' ? 'Admin executed payout transfer' : (rejectionReason ?? null),
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
        from: 'noizu.direct <noreply@noizu.direct>',
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
