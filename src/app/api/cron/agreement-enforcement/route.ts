import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

// ─── Email HTML helpers ───────────────────────────────────────────────────────

function agreementReminderHtml(name: string, unsignedTypes: string[]): string {
  const agreementsUrl = `${baseUrl}/dashboard/agreements`
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" style="height:50px;width:auto;" />
        </td></tr>
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">Action required: Sign updated agreements</p>
          <p style="margin:0 0 16px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Hi ${name}, there are updated platform agreements that require your signature to keep your creator account active.
          </p>
          <div style="background:#1a1a24;border:1px solid #3f3f4a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#8b8b9a;text-transform:uppercase;letter-spacing:0.05em;">Pending agreements</p>
            ${unsignedTypes.map((t) => `<p style="margin:0 0 4px;font-size:14px;color:#c4b5fd;">&#8226; ${t.replace(/_/g, ' ')}</p>`).join('')}
          </div>
          <p style="margin:0 0 24px;font-size:14px;color:#f59e0b;line-height:1.6;">
            Please sign these agreements within 30 days of their publication date. Failure to do so may result in your account being restricted.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${agreementsUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;">Review &amp; Sign Agreements</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#4b4b5a;">noizu.direct &mdash; Creator marketplace for SEA creators</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function accountRestrictedHtml(name: string, unsignedTypes: string[]): string {
  const agreementsUrl = `${baseUrl}/dashboard/agreements`
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" style="height:50px;width:auto;" />
        </td></tr>
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ef4444;">Account restricted</p>
          <p style="margin:0 0 16px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Hi ${name}, your noizu.direct creator account has been restricted because the following agreements were not signed within the required 30-day window.
          </p>
          <div style="background:#1a1a24;border:1px solid #3f3f4a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#8b8b9a;text-transform:uppercase;letter-spacing:0.05em;">Unsigned agreements</p>
            ${unsignedTypes.map((t) => `<p style="margin:0 0 4px;font-size:14px;color:#ef4444;">&#8226; ${t.replace(/_/g, ' ')}</p>`).join('')}
          </div>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Your listings have been deactivated. To restore your account, please sign all pending agreements. Your account and listings will be reactivated upon completion.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${agreementsUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;">Sign Agreements Now</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#4b4b5a;">noizu.direct &mdash; Creator marketplace for SEA creators</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function accountClosureHtml(name: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" style="height:50px;width:auto;" />
        </td></tr>
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">Account closure confirmed</p>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Hi ${name}, your noizu.direct creator account has been closed as requested. All your listings have been deactivated.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Thank you for being part of the noizu.direct community. If you change your mind or have questions, please contact us at <a href="mailto:hello@noizu.direct" style="color:#7c3aed;">hello@noizu.direct</a>.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#4b4b5a;">noizu.direct &mdash; Creator marketplace for SEA creators</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const now = new Date()

  let reminders = 0
  let restricted = 0
  let closed = 0

  // ── 1. Fetch active templates and active creator users ─────────────────────
  const [activeTemplates, creators] = await Promise.all([
    prisma.agreementTemplate.findMany({
      where: { isActive: true },
      orderBy: { publishedAt: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: 'CREATOR', accountStatus: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
        agreementsLastCheckedAt: true,
        closureRequestedAt: true,
        creatorAgreements: {
          where: { isActive: true },
          select: { templateId: true, agreementType: true },
        },
      },
    }),
  ])

  // ── 2. Agreement enforcement per creator ───────────────────────────────────
  for (const creator of creators) {
    const signedTemplateIds = new Set(creator.creatorAgreements.map((a) => a.templateId))

    const unsignedTemplates = activeTemplates.filter(
      (t) => t.publishedAt && !signedTemplateIds.has(t.id),
    )

    if (unsignedTemplates.length > 0) {
      // Find the oldest unsigned template by publishedAt
      const oldest = unsignedTemplates.reduce((prev, curr) => {
        const prevMs = prev.publishedAt!.getTime()
        const currMs = curr.publishedAt!.getTime()
        return currMs < prevMs ? curr : prev
      })

      const daysSincePublished = Math.floor(
        (now.getTime() - oldest.publishedAt!.getTime()) / (1000 * 60 * 60 * 24),
      )

      const unsignedTypes = unsignedTemplates.map((t) => t.type)

      if (daysSincePublished >= 30) {
        // Restrict account
        const restrictionReason = `Unsigned agreements: ${unsignedTypes.join(', ')}`

        await prisma.user.update({
          where: { id: creator.id },
          data: {
            accountStatus: 'RESTRICTED',
            restrictedAt: now,
            restrictionReason,
            agreementsLastCheckedAt: now,
          },
        })

        // Deactivate all products for this creator via creatorProfile
        const profile = await prisma.creatorProfile.findUnique({
          where: { userId: creator.id },
          select: { id: true },
        })

        if (profile) {
          await prisma.product.updateMany({
            where: { creatorId: profile.id, isActive: true },
            data: { isActive: false },
          })
        }

        // Create notification
        await prisma.notification.create({
          data: {
            userId: creator.id,
            type: 'FULFILLMENT_WARNING',
            title: 'Account restricted',
            message: `Your account has been restricted due to unsigned agreements: ${unsignedTypes.join(', ')}. Please sign all agreements to restore access.`,
            actionUrl: `${baseUrl}/dashboard/agreements`,
          },
        })

        await resend.emails.send({
          from: 'noreply@noizu.direct',
          to: [creator.email],
          subject: 'Your noizu.direct account has been restricted',
          html: accountRestrictedHtml(creator.name ?? 'Creator', unsignedTypes),
        })

        restricted++
      } else if (daysSincePublished >= 7) {
        // Send reminder if not sent in last 7 days
        const lastChecked = creator.agreementsLastCheckedAt
        const daysSinceLastReminder = lastChecked
          ? Math.floor((now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60 * 24))
          : 999

        if (daysSinceLastReminder >= 7) {
          await prisma.user.update({
            where: { id: creator.id },
            data: { agreementsLastCheckedAt: now },
          })

          await resend.emails.send({
            from: 'noreply@noizu.direct',
            to: [creator.email],
            subject: 'Action required: Sign updated noizu.direct agreements',
            html: agreementReminderHtml(creator.name ?? 'Creator', unsignedTypes),
          })

          reminders++
        }
      }
    }
  }

  // ── 3. Closure requests (closureRequestedAt set, >= 30 days ago) ───────────
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const closureUsers = await prisma.user.findMany({
    where: {
      closureRequestedAt: { not: null, lte: thirtyDaysAgo },
      accountStatus: { not: 'CLOSED' },
    },
    select: { id: true, name: true, email: true },
  })

  for (const user of closureUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { accountStatus: 'CLOSED' },
    })

    // Deactivate all listings
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })

    if (profile) {
      await prisma.product.updateMany({
        where: { creatorId: profile.id },
        data: { isActive: false },
      })
    }

    await resend.emails.send({
      from: 'noreply@noizu.direct',
      to: [user.email],
      subject: 'Your noizu.direct account has been closed',
      html: accountClosureHtml(user.name ?? 'Creator'),
    })

    closed++
  }

  return NextResponse.json({
    ok: true,
    processed: { reminders, restricted, closed },
  })
}
