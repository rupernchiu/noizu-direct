import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

function approvedEmailHtml(name: string): string {
  const dashboardUrl = `${baseUrl}/dashboard`
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" style="height:50px;width:auto;" />
        </td></tr>
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">Congratulations, ${name}! 🎉</p>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Your creator application has been approved. You now have access to your Creator Dashboard and can start publishing content, setting up your store, and building your audience on noizu.direct.
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#c4b5fd;font-weight:600;">Getting started:</p>
          <ul style="margin:0 0 24px;padding-left:20px;color:#8b8b9a;font-size:14px;line-height:1.8;">
            <li>Complete your creator profile with a bio and profile photo</li>
            <li>Create your first product or digital offering</li>
            <li>Share your creator page with your audience</li>
            <li>Set up your payout method to receive payments</li>
          </ul>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:8px;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;">Go to Creator Dashboard</a>
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

function rejectedEmailHtml(name: string, reason: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" style="height:50px;width:auto;" />
        </td></tr>
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">Creator Application Update</p>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Hi ${name}, thank you for taking the time to apply to become a creator on noizu.direct. After careful review, we were unable to approve your application at this time.
          </p>
          <div style="background:#1a1a24;border:1px solid #3f3f4a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#8b8b9a;text-transform:uppercase;letter-spacing:0.05em;">Reason</p>
            <p style="margin:0;font-size:14px;color:#e5e5f0;line-height:1.6;">${reason}</p>
          </div>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            You are welcome to reapply after addressing the issues noted above. If you have any questions or believe this decision was made in error, please reach out to us.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="mailto:hello@noizu.direct" style="display:inline-block;background:#27272f;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">Contact hello@noizu.direct</a>
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const application = await prisma.creatorApplication.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          creatorVerificationStatus: true,
          accountStatus: true,
          creatorAgreements: {
            select: {
              id: true,
              agreementType: true,
              agreementVersion: true,
              agreedAt: true,
              signedName: true,
              isActive: true,
            },
          },
        },
      },
    },
  })

  if (!application) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ application })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as {
    action: 'APPROVE' | 'REJECT'
    rejectionReason?: string
    adminNote?: string
  }

  const { action, rejectionReason, adminNote } = body
  const adminId = (session.user as any).id as string

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const application = await prisma.creatorApplication.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (!application) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  if (action === 'APPROVE') {
    await prisma.$transaction(async (tx) => {
      await tx.creatorApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: adminId,
          adminNote: adminNote ?? null,
        },
      })

      await tx.user.update({
        where: { id: application.userId },
        data: {
          role: 'CREATOR',
          creatorVerificationStatus: 'VERIFIED',
        },
      })

      const existingProfile = await tx.creatorProfile.findUnique({
        where: { userId: application.userId },
      })

      if (!existingProfile) {
        await tx.creatorProfile.create({
          data: {
            userId: application.userId,
            username: application.username,
            displayName: application.displayName,
            bio: application.bio,
            categoryTags: application.categoryTags,
          },
        })
      }
    })

    await resend.emails.send({
      from: 'noreply@noizu.direct',
      to: [application.user.email],
      subject: '🎉 Welcome to noizu.direct Creators!',
      html: approvedEmailHtml(application.user.name ?? 'Creator'),
    })

    // In-app notification + system message (best-effort — do not fail the approval)
    try {
      await prisma.notification.create({
        data: {
          userId: application.userId,
          type: 'APPLICATION_APPROVED',
          title: 'Creator application approved 🎉',
          message: 'Your creator application has been approved. Your store is now live on noizu.direct.',
          actionUrl: '/dashboard',
          isRead: false,
        },
      })

      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
      if (adminUser) {
        const conversation = await prisma.conversation.upsert({
          where: { buyerId_creatorId: { buyerId: application.userId, creatorId: adminUser.id } },
          create: { buyerId: application.userId, creatorId: adminUser.id, lastMessageAt: new Date() },
          update: { lastMessageAt: new Date() },
        })
        await prisma.message.create({
          data: {
            senderId: adminUser.id,
            receiverId: application.userId,
            content: `🎉 Welcome to noizu.direct, ${application.displayName}!\n\nYour creator application has been approved. Here is everything you need to get started:\n\n✅ Your store URL: noizu.direct/creator/${application.username}\n✅ Your username: @${application.username}\n\nGETTING STARTED:\n1. Go to your Creator Dashboard\n2. Complete your store profile (add banner, bio, social links)\n3. List your first product\n4. Share your store link with your community\n\nIMPORTANT REMINDERS:\n- You must add tracking numbers within 7 days of receiving physical/POD orders\n- Your first payout requires verified account status\n- Keep your storage under 500MB (free plan)\n\nWe are excited to have you as part of the noizu.direct creator community!\n\nThe noizu.direct Team\nhello@noizu.direct`,
            isRead: false,
          },
        })
        void conversation // suppress unused warning
      }
    } catch (notifErr) {
      console.error('[approve] notification/message error (non-fatal):', notifErr)
    }

    return NextResponse.json({ ok: true })
  }

  // REJECT
  if (!rejectionReason) {
    return NextResponse.json({ error: 'rejectionReason is required for rejection' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.creatorApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason,
        adminNote: adminNote ?? null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    }),
    prisma.user.update({
      where: { id: application.userId },
      data: { creatorVerificationStatus: 'REJECTED' },
    }),
  ])

  await resend.emails.send({
    from: 'noreply@noizu.direct',
    to: [application.user.email],
    subject: 'noizu.direct Creator Application Update',
    html: rejectedEmailHtml(application.user.name ?? 'Applicant', rejectionReason),
  })

  // In-app notification + system message (best-effort — do not fail the rejection)
  try {
    await prisma.notification.create({
      data: {
        userId: application.userId,
        type: 'APPLICATION_REJECTED',
        title: 'Creator application not approved',
        message: `Your creator application was not approved. Reason: ${rejectionReason}. You may reapply at any time.`,
        actionUrl: '/start-selling',
        isRead: false,
      },
    })

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
    if (adminUser) {
      const conversation = await prisma.conversation.upsert({
        where: { buyerId_creatorId: { buyerId: application.userId, creatorId: adminUser.id } },
        create: { buyerId: application.userId, creatorId: adminUser.id, lastMessageAt: new Date() },
        update: { lastMessageAt: new Date() },
      })
      await prisma.message.create({
        data: {
          senderId: adminUser.id,
          receiverId: application.userId,
          content: `Hi ${application.displayName || application.legalFullName},\n\nThank you for applying to become a noizu.direct creator.\n\nUnfortunately we were unable to approve your application at this time.\n\nREASON:\n${rejectionReason}\n\nWHAT TO DO NEXT:\n- Address the issues mentioned above\n- Prepare any required documents\n- Visit noizu.direct/start-selling to reapply\n\nYou are welcome to reapply at any time after addressing the feedback above.\n\nIf you have questions about this decision please reply to this message and our team will assist you.\n\nThe noizu.direct Team\nhello@noizu.direct`,
          isRead: false,
        },
      })
      void conversation // suppress unused warning
    }
  } catch (notifErr) {
    console.error('[reject] notification/message error (non-fatal):', notifErr)
  }

  return NextResponse.json({ ok: true })
}
