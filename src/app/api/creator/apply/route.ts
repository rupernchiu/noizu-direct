import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guards'
import { isOwnIdentityUrl } from '@/lib/upload-validators'

// H6 — bind KYC uploads to the submitting user.
// Preferred path: /api/upload returned an `uploadId` when the identity file
// was stored, and the client echoes it back here as idFrontUploadId /
// idBackUploadId / selfieUploadId. We re-look up that row and verify
// userId matches the session.
//
// Fallback: if the migration hasn't been applied or the client still posts
// raw URLs, require that the URL path includes the submitting user's id
// (see isOwnIdentityUrl). This closes the IDOR even in the fallback path.

async function resolveKycUpload(
  uploadId: string | null | undefined,
  userId: string,
  expectCategory: 'id_front' | 'id_back' | 'selfie',
): Promise<{ viewerUrl: string } | null> {
  if (!uploadId) return null
  try {
    const row = await prisma.kycUpload.findFirst({ where: { id: uploadId } })
    if (!row) return null
    if (row.userId !== userId) return null
    if (row.category !== expectCategory) return null
    return { viewerUrl: row.viewerUrl }
  } catch {
    // Migration pending on the target DB — caller will fall back to
    // URL-regex validation.
    return null
  }
}

function normaliseKycUrl(
  candidateUrl: string | null | undefined,
  userId: string,
): string | null {
  if (!candidateUrl) return null
  return isOwnIdentityUrl(candidateUrl, userId) ? candidateUrl : null
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

function submittedEmailHtml(
  name: string,
  email: string,
  applicationId: string,
  username: string,
): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" style="height:50px;width:auto;" />
        </td></tr>
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">Application received</p>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Hi ${name}, your creator application has been received and is now under review. Our team typically responds within 24–48 hours.
          </p>
          <div style="background:#1a1a24;border:1px solid #3f3f4a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#8b8b9a;text-transform:uppercase;letter-spacing:0.05em;">Reference</p>
            <p style="margin:0 0 12px;font-size:13px;color:#c4b5fd;font-family:monospace;">${applicationId}</p>
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#8b8b9a;text-transform:uppercase;letter-spacing:0.05em;">Reserved username</p>
            <p style="margin:0;font-size:14px;color:#ffffff;">@${username}</p>
          </div>
          <p style="margin:0;font-size:14px;color:#8b8b9a;line-height:1.6;">
            You'll receive an email at <strong style="color:#ffffff;">${email}</strong> with the outcome of your application. In the meantime, feel free to reach out to <a href="mailto:hello@noizu.direct" style="color:#7c3aed;">hello@noizu.direct</a> if you have any questions.
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

export async function GET() {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string

  const application = await prisma.creatorApplication.findUnique({
    where: { userId },
  })

  return NextResponse.json({ application })
}

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const userName = (session.user as any).name as string | undefined
  const userEmail = (session.user as any).email as string

  const body = await req.json() as {
    displayName?: string
    username?: string
    bio?: string
    categoryTags?: string
    legalFullName?: string
    dateOfBirth?: string
    nationality?: string
    country?: string
    phone?: string
    idType?: string
    idNumber?: string
    idOtherDescription?: string
    // H6 — preferred opaque handles (server re-looks-up and verifies ownership)
    idFrontUploadId?: string
    idBackUploadId?: string
    selfieUploadId?: string
    // Fallback raw URLs (regex-validated to include submitting user's id)
    idFrontImage?: string
    idBackImage?: string
    selfieImage?: string
    kycCompleted?: boolean
    bankCountryCode?: string
    bankCurrency?: string
    bankAccountName?: string
    bankName?: string
    bankCode?: string
    bankAccountNumber?: string
    bankRoutingCode?: string
    paypalEmail?: string
  }

  if (!body.legalFullName?.trim()) {
    return NextResponse.json({ error: 'Legal full name is required' }, { status: 400 })
  }

  // ── H6 — resolve KYC upload references server-side ──────────────────────
  // Prefer KycUpload.id lookup; fall back to regex on the raw URL. Either
  // way, we refuse a URL that doesn't include the submitting user's id.
  const idFrontResolved = (await resolveKycUpload(body.idFrontUploadId, userId, 'id_front'))?.viewerUrl
    ?? normaliseKycUrl(body.idFrontImage, userId)
  const idBackResolved = (await resolveKycUpload(body.idBackUploadId, userId, 'id_back'))?.viewerUrl
    ?? normaliseKycUrl(body.idBackImage, userId)
  const selfieResolved = (await resolveKycUpload(body.selfieUploadId, userId, 'selfie'))?.viewerUrl
    ?? normaliseKycUrl(body.selfieImage, userId)

  // If any KYC field was supplied but failed verification, reject rather than
  // silently dropping it — the creator would get an application with a
  // blank document and a confusing review outcome.
  const suppliedAnyKyc = Boolean(
    body.idFrontImage || body.idBackImage || body.selfieImage ||
    body.idFrontUploadId || body.idBackUploadId || body.selfieUploadId,
  )
  const resolvedAnyKyc = Boolean(idFrontResolved || idBackResolved || selfieResolved)
  if (suppliedAnyKyc && !resolvedAnyKyc) {
    return NextResponse.json(
      { error: 'Uploaded identity documents could not be verified against your account. Please re-upload.' },
      { status: 400 },
    )
  }

  const data = {
    displayName: body.displayName ?? '',
    username: body.username ?? '',
    bio: body.bio ?? '',
    categoryTags: Array.isArray(body.categoryTags)
      ? JSON.stringify(body.categoryTags)
      : (body.categoryTags ?? '[]'),
    legalFullName: body.legalFullName.trim(),
    dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    nationality: body.nationality ?? '',
    country: body.country ?? '',
    phone: body.phone ?? '',
    idType: body.idType ?? 'IC',
    idNumber: body.idNumber ?? '',
    idOtherDescription: body.idOtherDescription ?? '',
    idFrontImage: idFrontResolved ?? null,
    idBackImage: idBackResolved ?? null,
    selfieImage: selfieResolved ?? null,
    kycCompleted: body.kycCompleted ?? false,
    bankCountryCode: body.bankCountryCode ?? '',
    bankCurrency: body.bankCurrency ?? '',
    bankAccountName: body.bankAccountName ?? '',
    bankName: body.bankName ?? '',
    bankCode: body.bankCode ?? '',
    bankAccountNumber: body.bankAccountNumber ?? '',
    bankRoutingCode: body.bankRoutingCode ?? '',
    paypalEmail: body.paypalEmail ?? null,
    status: 'SUBMITTED',
    submittedAt: new Date(),
  }

  let application
  try {
    application = await prisma.creatorApplication.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Database error'
    console.error('[apply POST] prisma upsert failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        creatorVerificationStatus: 'PENDING',
        legalFullName: body.legalFullName?.trim() || undefined,
      },
    })
  } catch (err) {
    console.error('[apply POST] user update failed:', err)
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'noreply@noizu.direct',
      to: [userEmail],
      subject: 'Application received — noizu.direct Creator',
      html: submittedEmailHtml(
        userName ?? 'Applicant',
        userEmail,
        application.id,
        application.username,
      ),
    })
  } catch (err) {
    console.error('[apply POST] email send failed:', err)
  }

  try {
    await prisma.notification.create({
      data: {
        userId,
        type: 'CREATOR_APPLICATION_SUBMITTED',
        title: 'Application received',
        message: "Your creator application is under review. We'll notify you once it's been reviewed.",
        actionUrl: '/account',
        isRead: false,
      },
    })
  } catch (err) {
    console.error('[apply POST] notification failed:', err)
  }

  return NextResponse.json({ ok: true, applicationId: application.id })
}
