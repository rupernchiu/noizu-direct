import { prisma } from './prisma'
import { Resend } from 'resend'

const GRACE_PERIOD_DAYS = 30
const REMINDER_THRESHOLD_DAYS = 7 // send reminder when <= this many days remain

// ── Compliance check ──────────────────────────────────────────────────────────

export async function checkCreatorCompliance(userId: string): Promise<{
  compliant: boolean
  unsignedTypes: string[]
  daysSincePublished: number | null
  shouldRestrict: boolean
  shouldSendReminder: boolean
}> {
  // Find all active agreement templates the user has NOT signed with an active agreement
  const unsigned = await prisma.agreementTemplate.findMany({
    where: {
      isActive: true,
      agreements: { none: { userId, isActive: true } },
    },
    select: { type: true, publishedAt: true },
  })

  if (unsigned.length === 0) {
    return {
      compliant: true,
      unsignedTypes: [],
      daysSincePublished: null,
      shouldRestrict: false,
      shouldSendReminder: false,
    }
  }

  const unsignedTypes = unsigned.map(a => a.type)

  // Find the oldest publishedAt among unsigned agreements
  const publishedDates = unsigned
    .map(a => a.publishedAt)
    .filter((d): d is Date => d !== null)

  let daysSincePublished: number | null = null
  let shouldRestrict = false
  let shouldSendReminder = false

  if (publishedDates.length > 0) {
    const oldest = new Date(Math.min(...publishedDates.map(d => d.getTime())))
    daysSincePublished = Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = GRACE_PERIOD_DAYS - daysSincePublished
    shouldRestrict = daysRemaining <= 0
    shouldSendReminder = daysRemaining > 0 && daysRemaining <= REMINDER_THRESHOLD_DAYS
  }

  return {
    compliant: false,
    unsignedTypes,
    daysSincePublished,
    shouldRestrict,
    shouldSendReminder,
  }
}

// ── Restrict creator ──────────────────────────────────────────────────────────

export async function restrictCreator(userId: string, unsignedTypes: string[]): Promise<void> {
  const now = new Date()
  const reason = `Unsigned agreements: ${unsignedTypes.join(', ')}`

  // Fetch creator profile for product deactivation
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'RESTRICTED',
        restrictedAt: now,
        restrictionReason: reason,
      },
    })

    if (profile) {
      await tx.product.updateMany({
        where: { creatorId: profile.id },
        data: { isActive: false },
      })
    }

    await tx.notification.create({
      data: {
        userId,
        type: 'ORDER_CANCELLED',
        title: 'Account restricted',
        message: `Your account has been restricted because the following agreements remain unsigned: ${unsignedTypes.join(', ')}. Sign them to restore access.`,
        actionUrl: '/dashboard',
      },
    })
  })

  console.info(`[agreement-enforcement] Restricted userId=${userId} for: ${reason}`)
}

// ── Process closure requests ──────────────────────────────────────────────────

export async function processClosureRequests(): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const dueForClosure = await prisma.user.findMany({
    where: {
      closureRequestedAt: { lte: cutoff },
      accountStatus: { not: 'CLOSED' },
    },
    select: { id: true },
  })

  let processed = 0

  for (const { id: userId } of dueForClosure) {
    try {
      const profile = await prisma.creatorProfile.findUnique({
        where: { userId },
        select: { id: true },
      })

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { accountStatus: 'CLOSED' },
        })

        if (profile) {
          await tx.product.updateMany({
            where: { creatorId: profile.id },
            data: { isActive: false },
          })
        }
      })

      processed++
      console.info(`[agreement-enforcement] Closed account userId=${userId}`)
    } catch (err) {
      console.error(`[agreement-enforcement] Failed to close userId=${userId}:`, err)
    }
  }

  return processed
}

// ── Send reminder email ───────────────────────────────────────────────────────

export async function sendReminderEmail(
  userId: string,
  unsignedTypes: string[],
  daysRemaining: number,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (!user) return

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'
  const dashboardUrl = `${baseUrl}/dashboard`

  const urgentColor = daysRemaining <= 3 ? '#ef4444' : '#eab308'
  const urgencyText =
    daysRemaining <= 1
      ? `<strong style="color:${urgentColor};">Today is your last chance</strong> — your account will be restricted if you do not sign.`
      : `You have <strong style="color:${urgentColor};">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining</strong> to sign before your account is restricted.`

  const agreementList = unsignedTypes
    .map(t => `<li style="margin-bottom:4px;">${t}</li>`)
    .join('')

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'noreply@noizu.direct',
      to: [user.email],
      subject: `Action required: Sign your agreements (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining)`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="NOIZU-DIRECT" height="50" style="height:50px;width:auto;display:inline-block;" />
        </td></tr>
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">Agreement Signature Required</p>
          <p style="margin:0 0 16px;font-size:14px;color:#8b8b9a;line-height:1.6;">Hi ${user.name},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            ${urgencyText}
          </p>
          <p style="margin:0 0 8px;font-size:14px;color:#8b8b9a;">The following agreements need your signature:</p>
          <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#8b8b9a;line-height:1.8;">
            ${agreementList}
          </ul>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:24px;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;">
              Sign Now
            </a>
          </td></tr></table>
          <p style="margin:0;font-size:13px;color:#4b4b5a;">
            If you have questions, contact us at <a href="mailto:hello@noizu.direct" style="color:#7c3aed;">hello@noizu.direct</a>.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#4b4b5a;">NOIZU-DIRECT &mdash; Creator marketplace</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
    console.info(`[agreement-enforcement] Reminder sent to userId=${userId} (${daysRemaining}d remaining)`)
  } catch (err) {
    console.error(`[agreement-enforcement] Failed to send reminder to userId=${userId}:`, err)
  }
}
