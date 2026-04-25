// KYC orphan cleanup — daily cron.
//
// Lifecycle for DRAFT CreatorApplication rows that have sat idle:
//   day 5  → one-shot reminder email (kycReminderSentAt marker prevents retries)
//   day 7+ → hard purge of all KycUpload rows + private R2 objects + sensitive
//            CreatorApplication fields. The application row itself is KEPT
//            (status still DRAFT) with orphanedAt stamped so we can prove in
//            audit that the purge ran against this user.
//
// All private R2 deletes go through auditedDeletePrivate — every file removed
// gets a PrivateFileDeletion row written first. If the audit write fails, the
// R2 delete is skipped (auditedDeletePrivate throws, we catch and count).
//
// Safety: hard cap of 100 orphans per invocation so a pathological backlog
// can't flood the log or exceed Vercel's function timeout.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isCronAuthorized } from '@/lib/cron-auth'
import { withCronHeartbeat } from '@/lib/cron-heartbeat'
import { auditedDeletePrivate } from '@/lib/private-file-audit'
import { Resend } from 'resend'

const MAX_ORPHANS_PER_RUN = 100
const CRON_ACTOR_ID = 'cron:kyc-orphan-cleanup'
const CRON_ACTOR_NAME = 'Cron: kyc-orphan-cleanup'
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

// ── Email template for day-5 reminder ────────────────────────────────────────

function reminderHtml(name: string): string {
  const resumeUrl = `${baseUrl}/creator/apply`
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Finish your creator application, ${name}</p>
          <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Your noizu.direct creator application is still in draft and will be automatically deleted in 2 days if you don't complete it.
          </p>
          <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Any ID images or banking details you've uploaded so far will be permanently removed from our private storage. Sign back in to finish submitting.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-top:4px;">
            <a href="${resumeUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;">Resume Application</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#4b4b5a;">noizu.direct &mdash; Creator marketplace</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

async function sendReminder(email: string, name: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'noreply@noizu.direct',
    to: [email],
    subject: 'Your creator application will be deleted in 2 days',
    html: reminderHtml(name),
  })
}

// ── Main job ────────────────────────────────────────────────────────────────

async function run() {
  const now = new Date()
  const FIVE_DAYS_MS = 5 * 86_400_000
  const SEVEN_DAYS_MS = 7 * 86_400_000
  const fiveDaysAgo = new Date(now.getTime() - FIVE_DAYS_MS)
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS)

  let remindersSent = 0
  let orphansPurged = 0
  let filesDeleted = 0
  const errors: string[] = []

  // ── Step 1: day-5 reminders ────────────────────────────────────────────────
  // DRAFTs where updatedAt is in (now-7d, now-5d) and no reminder yet.
  // updatedAt < now-5d AND updatedAt > now-7d keeps us inside the day-5 window
  // and skips already-purge-eligible (>=7d) rows, which Step 2 handles.
  const reminderCandidates = await prisma.creatorApplication.findMany({
    where: {
      status: 'DRAFT',
      kycReminderSentAt: null,
      updatedAt: { lt: fiveDaysAgo, gt: sevenDaysAgo },
    },
    select: {
      id: true,
      userId: true,
      user: { select: { email: true, name: true } },
    },
    take: MAX_ORPHANS_PER_RUN,
  })

  for (const app of reminderCandidates) {
    try {
      await sendReminder(app.user.email, app.user.name || 'there')
      await prisma.creatorApplication.update({
        where: { id: app.id },
        data: { kycReminderSentAt: new Date() },
      })
      remindersSent++
    } catch (e) {
      // Don't set marker on failure — next run will retry. Log and continue.
      errors.push(`reminder ${app.id}: ${(e as Error).message}`)
      console.error('[cron/kyc-orphan-cleanup] reminder failed', { appId: app.id, err: (e as Error).message })
    }
  }

  // ── Step 2: day-7 purge ────────────────────────────────────────────────────
  const purgeCandidates = await prisma.creatorApplication.findMany({
    where: {
      status: 'DRAFT',
      orphanedAt: null,
      updatedAt: { lt: sevenDaysAgo },
    },
    select: { id: true, userId: true },
    take: MAX_ORPHANS_PER_RUN,
  })

  for (const app of purgeCandidates) {
    try {
      // Load every KYC upload for this user — live AND superseded.
      const uploads = await prisma.kycUpload.findMany({
        where: { userId: app.userId },
        select: { id: true, r2Key: true },
      })

      // Delete each R2 object via the audited path. If one fails, we surface
      // it but keep going so a single bad key doesn't strand the whole purge.
      for (const up of uploads) {
        try {
          await auditedDeletePrivate({
            actorType: 'SYSTEM',
            actorId: CRON_ACTOR_ID,
            actorName: CRON_ACTOR_NAME,
            targetUserId: app.userId,
            category: 'identity',
            r2Key: up.r2Key,
            reasonCode: 'ORPHAN_PURGE',
            policyApplied: 'ORPHAN_7D',
          })
          filesDeleted++
        } catch (e) {
          errors.push(`r2 delete ${up.r2Key.slice(0, 64)}: ${(e as Error).message}`)
          console.error('[cron/kyc-orphan-cleanup] r2 delete failed', {
            r2Key: up.r2Key.slice(0, 64),
            err: (e as Error).message,
          })
        }
      }

      // Drop KycUpload rows for this user regardless of individual R2 outcome —
      // the PrivateFileDeletion rows written by auditedDeletePrivate preserve
      // the audit trail for keys that did succeed, and keys that failed will
      // surface as "DB-only" mismatches in the weekly reconcile cron.
      await prisma.kycUpload.deleteMany({ where: { userId: app.userId } })

      // KEEP the CreatorApplication row for historical record. Strip every
      // sensitive field, stamp orphanedAt. status stays DRAFT (matches spec).
      await prisma.creatorApplication.update({
        where: { id: app.id },
        data: {
          orphanedAt: new Date(),
          idFrontImage: null,
          idBackImage: null,
          selfieImage: null,
          idNumber: '',
          idOtherDescription: '',
          bankAccountNumber: '',
          bankRoutingCode: '',
          paypalEmail: null,
          legalFullName: '',
          dateOfBirth: null,
        },
      })

      orphansPurged++
    } catch (e) {
      errors.push(`purge ${app.id}: ${(e as Error).message}`)
      console.error('[cron/kyc-orphan-cleanup] purge failed', { appId: app.id, err: (e as Error).message })
    }
  }

  console.log('[cron/kyc-orphan-cleanup] done', {
    remindersSent,
    orphansPurged,
    filesDeleted,
    errorCount: errors.length,
  })

  return { ok: true as const, remindersSent, orphansPurged, filesDeleted, errors }
}

// ── Handlers ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await withCronHeartbeat('kyc-orphan-cleanup', () => run()))
  } catch (e) {
    console.error('[cron/kyc-orphan-cleanup]', e)
    return NextResponse.json(
      { ok: false, remindersSent: 0, orphansPurged: 0, filesDeleted: 0, errors: [(e as Error).message] },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await withCronHeartbeat('kyc-orphan-cleanup', () => run()))
  } catch (e) {
    console.error('[cron/kyc-orphan-cleanup]', e)
    return NextResponse.json(
      { ok: false, remindersSent: 0, orphansPurged: 0, filesDeleted: 0, errors: [(e as Error).message] },
      { status: 500 },
    )
  }
}
