// Private-file retention flag — weekly cron.
//
// Builds an admin work queue. NO DELETIONS — deletion still requires a human
// click in /admin/private-files/housekeeping. This cron only counts candidates
// and notifies support when the queue is non-empty.
//
// Retention policies this cron watches:
//   • KYC uploads on REJECTED applications older than 90 days (live rows only)
//   • Dispute evidence on RESOLVED/CLOSED disputes older than 540 days
//   • DRAFT CreatorApplications inactive 7+ days (should be ~0 if the daily
//     kyc-orphan-cleanup cron is running — this count is a cross-check)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isCronAuthorized } from '@/lib/cron-auth'
import { Resend } from 'resend'

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'support@noizu.direct'
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

async function sendSummaryEmail(
  kyc: number,
  dispute: number,
  orphans: number,
): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const reviewUrl = `${baseUrl}/admin/private-files/housekeeping`
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:32px;">
          <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;">Weekly private-file retention report</p>
          <ul style="margin:0 0 20px;padding-left:20px;color:#c4b5fd;font-size:14px;line-height:1.8;">
            <li>${kyc} KYC retention candidates (REJECTED applications, 90+ days)</li>
            <li>${dispute} dispute evidence retention candidates (closed 540+ days)</li>
            <li>${orphans} orphan DRAFT applications (should normally be 0)</li>
          </ul>
          <p style="margin:0 0 16px;font-size:13px;color:#8b8b9a;line-height:1.6;">
            Review and action these items in the admin housekeeping UI. No files have been deleted automatically.
          </p>
          <a href="${reviewUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:11px 24px;border-radius:10px;">Open Housekeeping</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
  try {
    await resend.emails.send({
      from: 'noreply@noizu.direct',
      to: [SUPPORT_EMAIL],
      subject: `[retention] ${kyc} KYC / ${dispute} dispute / ${orphans} orphan candidates to review`,
      html,
    })
    return true
  } catch (e) {
    console.error('[cron/private-file-retention-flag] email send failed', (e as Error).message)
    return false
  }
}

async function run() {
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000)
  const fiveFortyDaysAgo = new Date(now.getTime() - 540 * 86_400_000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)

  // ── KYC candidates: live rows whose owning app is REJECTED 90+ days ───────
  // Prisma can't join KycUpload → CreatorApplication on userId in a single
  // where-filter cleanly, so we fetch rejected-user ids first, then count.
  const rejectedUsers = await prisma.creatorApplication.findMany({
    where: {
      status: 'REJECTED',
      reviewedAt: { lt: ninetyDaysAgo },
    },
    select: { userId: true },
  })
  const rejectedUserIds = rejectedUsers.map((u) => u.userId)

  const kycCandidates =
    rejectedUserIds.length === 0
      ? 0
      : await prisma.kycUpload.count({
          where: {
            supersededAt: null,
            createdAt: { lt: ninetyDaysAgo },
            userId: { in: rejectedUserIds },
          },
        })

  // ── Dispute evidence on closed disputes, 540+ days ────────────────────────
  const disputeCandidates = await prisma.disputeEvidence.count({
    where: {
      supersededAt: null,
      uploadedAt: { lt: fiveFortyDaysAgo },
      dispute: {
        status: { in: ['RESOLVED_REFUND', 'RESOLVED_RELEASE', 'CLOSED'] },
      },
    },
  })

  // ── Orphan DRAFT cross-check (daily cron should keep this near 0) ─────────
  const orphanDrafts = await prisma.creatorApplication.count({
    where: {
      status: 'DRAFT',
      updatedAt: { lt: sevenDaysAgo },
      orphanedAt: null,
    },
  })

  let emailSent = false
  if (kycCandidates > 0 || disputeCandidates > 0 || orphanDrafts > 0) {
    emailSent = await sendSummaryEmail(kycCandidates, disputeCandidates, orphanDrafts)
  }

  // One AuditEvent row summarising the counts for historical tracking.
  await prisma.auditEvent
    .create({
      data: {
        actorId: null,
        actorName: 'Cron: private-file-retention-flag',
        action: 'RETENTION_SCAN',
        entityType: 'PrivateFile',
        entityId: 'summary',
        entityLabel: `kyc=${kycCandidates} dispute=${disputeCandidates} orphan=${orphanDrafts}`,
        afterJson: JSON.stringify({
          kycCandidates,
          disputeCandidates,
          orphanDrafts,
          emailSent,
          scannedAt: now.toISOString(),
        }),
      },
    })
    .catch((err: unknown) =>
      console.error('[cron/private-file-retention-flag] audit write failed', (err as Error).message),
    )

  console.log('[cron/private-file-retention-flag] done', {
    kycCandidates,
    disputeCandidates,
    orphanDrafts,
    emailSent,
  })

  return {
    ok: true as const,
    kycCandidates,
    disputeCandidates,
    orphanDrafts,
    emailSent,
  }
}

export async function POST(req: NextRequest) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await run())
  } catch (e) {
    console.error('[cron/private-file-retention-flag]', e)
    return NextResponse.json(
      {
        ok: false,
        kycCandidates: 0,
        disputeCandidates: 0,
        orphanDrafts: 0,
        emailSent: false,
        error: (e as Error).message,
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await run())
  } catch (e) {
    console.error('[cron/private-file-retention-flag]', e)
    return NextResponse.json(
      {
        ok: false,
        kycCandidates: 0,
        disputeCandidates: 0,
        orphanDrafts: 0,
        emailSent: false,
        error: (e as Error).message,
      },
      { status: 500 },
    )
  }
}
