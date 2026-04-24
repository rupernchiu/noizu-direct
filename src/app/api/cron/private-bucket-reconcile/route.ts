// Private-bucket reconciler — weekly cron.
//
// Lists every R2 key under the `private/` prefix (capped at 20k) and compares
// against the full set of DB rows that should own those keys (KycUpload,
// DisputeEvidence, TicketAttachment). Purely diagnostic — NO
// deletions, NO uploads. The output is:
//   • inR2OnlyButNotDb  — orphan R2 objects with no owning DB row
//   • inDbOnlyButNotR2  — DB rows pointing at a missing R2 object
//
// If either mismatch set is non-empty AND the count is < 500, a sample of the
// first 20 keys each is emailed to support. For larger mismatches we just say
// "500+" and point at the housekeeping UI — we don't want to dump thousands of
// keys into an email body.
//
// One AuditEvent is written per run for long-term tracking.

import { NextRequest, NextResponse } from 'next/server'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { prisma } from '@/lib/prisma'
import { isCronAuthorized } from '@/lib/cron-auth'
import { r2Private, PRIVATE_BUCKET } from '@/lib/r2'
import { Resend } from 'resend'

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'support@noizu.direct'
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'
const MAX_KEYS = 20_000
const SAMPLE_SIZE = 20
const EMAIL_SAMPLE_THRESHOLD = 500

// Which R2 prefixes this cron considers "private and owned by the DB".
// Ticket attachments are only tracked if they use one of the private prefixes.
const PRIVATE_PREFIXES = [
  'private/',
  'identity/',
  'dispute-evidence/',
  'dispute_evidence/',
  'message-attachment/',
  'message_attachment/',
  'kyc/',
]

async function listAllPrivateKeys(): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined = undefined

  // Only one prefix is technically 'private/', but admins may have legacy
  // objects under the other categories — list each prefix so we don't miss
  // older uploads. The combined cap across prefixes is MAX_KEYS.
  for (const prefix of PRIVATE_PREFIXES) {
    continuationToken = undefined
    // Paginate until no more continuation token or cap reached.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (keys.length >= MAX_KEYS) return keys

      const res: {
        Contents?: { Key?: string }[]
        IsTruncated?: boolean
        NextContinuationToken?: string
      } = await r2Private.send(
        new ListObjectsV2Command({
          Bucket: PRIVATE_BUCKET,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        }),
      )

      for (const obj of res.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key)
        if (keys.length >= MAX_KEYS) return keys
      }

      if (!res.IsTruncated || !res.NextContinuationToken) break
      continuationToken = res.NextContinuationToken
    }
  }

  return keys
}

async function collectDbKeys(): Promise<Set<string>> {
  const dbKeys = new Set<string>()

  // KycUpload (live + superseded are both real bytes in R2 until deleted)
  const kyc = await prisma.kycUpload.findMany({ select: { r2Key: true } })
  for (const r of kyc) dbKeys.add(r.r2Key)

  // DisputeEvidence (live + superseded)
  const disputes = await prisma.disputeEvidence.findMany({ select: { r2Key: true } })
  for (const r of disputes) dbKeys.add(r.r2Key)

  // Ticket attachments — TicketAttachment.r2Key is canonical. We only count
  // keys that fall under one of the PRIVATE_PREFIXES.
  const ticketAttachments = await prisma.ticketAttachment.findMany({
    select: { r2Key: true },
  })
  for (const a of ticketAttachments) {
    if (!a.r2Key) continue
    if (PRIVATE_PREFIXES.some((p) => a.r2Key.startsWith(p))) {
      dbKeys.add(a.r2Key)
    }
  }

  return dbKeys
}

async function sendMismatchEmail(
  r2OnlyCount: number,
  dbOnlyCount: number,
  r2OnlySample: string[],
  dbOnlySample: string[],
): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const reviewUrl = `${baseUrl}/admin/private-files/housekeeping`

  const renderList = (label: string, count: number, sample: string[]) => {
    if (count === 0) return ''
    if (count >= EMAIL_SAMPLE_THRESHOLD) {
      return `<p style="margin:12px 0 4px;color:#c4b5fd;font-weight:600;">${label}: 500+ mismatches — inspect via admin UI</p>`
    }
    const items = sample
      .map((k) => `<li style="font-family:monospace;font-size:12px;color:#8b8b9a;">${k}</li>`)
      .join('')
    return `<p style="margin:12px 0 4px;color:#c4b5fd;font-weight:600;">${label} (${count} total, first ${sample.length}):</p><ul style="margin:0 0 8px;padding-left:20px;">${items}</ul>`
  }

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:32px;">
          <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;">Weekly private-bucket reconcile report</p>
          <p style="margin:0 0 16px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Mismatches between R2 private bucket contents and the database.
          </p>
          ${renderList('R2 objects with no DB row', r2OnlyCount, r2OnlySample)}
          ${renderList('DB rows with no R2 object', dbOnlyCount, dbOnlySample)}
          <p style="margin:20px 0 16px;font-size:13px;color:#8b8b9a;line-height:1.6;">
            No files have been deleted automatically. Investigate and resolve via the housekeeping UI.
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
      subject: `[reconcile] R2-only=${r2OnlyCount} / DB-only=${dbOnlyCount} — private bucket drift`,
      html,
    })
    return true
  } catch (e) {
    console.error('[cron/private-bucket-reconcile] email send failed', (e as Error).message)
    return false
  }
}

async function run() {
  const r2Keys = await listAllPrivateKeys()
  const dbKeys = await collectDbKeys()
  const r2Set = new Set(r2Keys)

  const r2OnlyList: string[] = []
  for (const k of r2Keys) {
    if (!dbKeys.has(k)) r2OnlyList.push(k)
  }

  const dbOnlyList: string[] = []
  for (const k of dbKeys) {
    if (!r2Set.has(k)) dbOnlyList.push(k)
  }

  const r2OnlyCount = r2OnlyList.length
  const dbOnlyCount = dbOnlyList.length

  let emailSent = false
  if (r2OnlyCount > 0 || dbOnlyCount > 0) {
    emailSent = await sendMismatchEmail(
      r2OnlyCount,
      dbOnlyCount,
      r2OnlyList.slice(0, SAMPLE_SIZE),
      dbOnlyList.slice(0, SAMPLE_SIZE),
    )
  }

  await prisma.auditEvent
    .create({
      data: {
        actorId: null,
        actorName: 'Cron: private-bucket-reconcile',
        action: 'PRIVATE_BUCKET_RECONCILE',
        entityType: 'PrivateBucket',
        entityId: PRIVATE_BUCKET,
        entityLabel: `r2=${r2Keys.length} db=${dbKeys.size} r2Only=${r2OnlyCount} dbOnly=${dbOnlyCount}`,
        afterJson: JSON.stringify({
          r2KeyCount: r2Keys.length,
          dbKeyCount: dbKeys.size,
          r2OnlyCount,
          dbOnlyCount,
          emailSent,
          scannedAt: new Date().toISOString(),
        }),
      },
    })
    .catch((err: unknown) =>
      console.error('[cron/private-bucket-reconcile] audit write failed', (err as Error).message),
    )

  console.log('[cron/private-bucket-reconcile] done', {
    r2KeyCount: r2Keys.length,
    dbKeyCount: dbKeys.size,
    r2OnlyCount,
    dbOnlyCount,
    emailSent,
  })

  return {
    ok: true as const,
    r2KeyCount: r2Keys.length,
    dbKeyCount: dbKeys.size,
    r2OnlyCount,
    dbOnlyCount,
  }
}

export async function POST(req: NextRequest) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await run())
  } catch (e) {
    console.error('[cron/private-bucket-reconcile]', e)
    return NextResponse.json(
      {
        ok: false,
        r2KeyCount: 0,
        dbKeyCount: 0,
        r2OnlyCount: 0,
        dbOnlyCount: 0,
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
    console.error('[cron/private-bucket-reconcile]', e)
    return NextResponse.json(
      {
        ok: false,
        r2KeyCount: 0,
        dbKeyCount: 0,
        r2OnlyCount: 0,
        dbOnlyCount: 0,
        error: (e as Error).message,
      },
      { status: 500 },
    )
  }
}
