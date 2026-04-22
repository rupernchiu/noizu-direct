import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { createBeneficiary } from '@/lib/airwallex'
import { encryptPayoutDetails, tryDecryptPayoutDetails } from '@/lib/payout-crypto'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'

const resend = new Resend(process.env.RESEND_API_KEY)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

// H4 — payout-destination cooldown. A newly supplied beneficiary sits in
// PayoutSettingChange for 48h before the payout cron will use it. A legitimate
// creator who actually made the change will ignore the confirmation email; a
// real account owner under attack has two days to notice and revoke.
const PAYOUT_COOLDOWN_MS = 48 * 60 * 60 * 1000

function emailShell(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding-bottom:32px;text-align:center;"><img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" /></td></tr>
<tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">${body}</td></tr>
<tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#4b4b5a;">noizu.direct &mdash; Creator marketplace for SEA creators</p></td></tr>
</table></td></tr></table></body></html>`
}

export async function GET() {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: {
      payoutMethod: true,
      payoutCountry: true,
      payoutCurrency: true,
      payoutDetails: true,
      airwallexBeneficiaryId: true,
    },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  let maskedAccount: string | null = null
  if (profile.payoutDetails) {
    try {
      const raw = tryDecryptPayoutDetails(profile.payoutDetails, userId)
      if (raw) {
        const details = JSON.parse(raw) as Record<string, string>
        if (details.accountNumber) {
          maskedAccount = '····' + details.accountNumber.slice(-4)
        } else if (details.paypalEmail) {
          const [local, domain] = details.paypalEmail.split('@')
          maskedAccount = local.slice(0, 2) + '···@' + domain
        }
      }
    } catch {}
  }

  // Surface any pending change so the UI can explain the 48h hold.
  const pending = await prisma.payoutSettingChange.findFirst({
    where: { userId, appliedAt: null, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    payoutMethod: profile.payoutMethod,
    payoutCountry: profile.payoutCountry,
    payoutCurrency: profile.payoutCurrency,
    hasBeneficiary: !!profile.airwallexBeneficiaryId,
    maskedAccount,
    pendingChange: pending
      ? {
          activatesAt: pending.activatesAt.toISOString(),
          newPayoutMethod: pending.newPayoutMethod,
        }
      : null,
  })
}

export async function POST(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const body = await req.json() as {
    payoutMethod: 'bank_transfer' | 'paypal'
    payoutCountry?: string
    payoutCurrency?: string
    accountName?: string
    bankName?: string
    accountNumber?: string
    routingCode?: string
    swiftCode?: string
    paypalEmail?: string
    // H4 — password re-auth. We verify against the bcrypt hash on the user
    // record before accepting a destination change, so a stolen session cookie
    // alone is not enough to redirect payouts.
    currentPassword?: string
  }

  const { payoutMethod, payoutCountry, payoutCurrency, currentPassword } = body

  if (!payoutMethod) return NextResponse.json({ error: 'payoutMethod is required' }, { status: 400 })

  // ── Password re-auth ────────────────────────────────────────────────────────
  // Users authenticated purely via Google OAuth have `user.password === null`;
  // we require a password to be set before allowing payout changes. Users who
  // only sign in with Google need to set a password first (existing flow).
  if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
    return NextResponse.json(
      { error: 'Password confirmation is required to change payout destination' },
      { status: 400 },
    )
  }

  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, password: true },
  })
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (!userRow.password) {
    return NextResponse.json(
      { error: 'Set a password on your account before changing payout details' },
      { status: 400 },
    )
  }
  const passwordOk = await bcrypt.compare(currentPassword, userRow.password)
  if (!passwordOk) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  // ── Build encrypted payload ─────────────────────────────────────────────────
  let beneficiaryId: string | null = null
  let encryptedDetails: string | null = null

  if (payoutMethod === 'bank_transfer') {
    const { accountName, bankName, accountNumber, routingCode, swiftCode } = body
    if (!accountName || !bankName || !accountNumber || !payoutCountry || !payoutCurrency) {
      return NextResponse.json({ error: 'Account name, bank name, account number, country and currency are required' }, { status: 400 })
    }

    try {
      const beneficiary = await createBeneficiary({
        creatorId: userId,
        accountName,
        bankName,
        accountNumber,
        routingCode,
        swiftCode,
        country: payoutCountry,
        currency: payoutCurrency,
      })
      beneficiaryId = beneficiary.beneficiary_id
    } catch (e) {
      console.error('Airwallex createBeneficiary error:', e)
    }

    encryptedDetails = encryptPayoutDetails(
      JSON.stringify({ accountName, bankName, accountNumber, routingCode, swiftCode }),
      userId,
    )
  } else if (payoutMethod === 'paypal') {
    const { paypalEmail } = body
    if (!paypalEmail) return NextResponse.json({ error: 'PayPal email is required' }, { status: 400 })
    encryptedDetails = encryptPayoutDetails(JSON.stringify({ paypalEmail }), userId)
  }

  if (!encryptedDetails) {
    return NextResponse.json({ error: 'Unsupported payout method' }, { status: 400 })
  }

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { payoutMethod: true, payoutDetails: true },
  })

  // ── 48h cooldown flow ───────────────────────────────────────────────────────
  // If the creator has never set a destination (first-time setup), apply
  // immediately — no prior beneficiary means there's no existing destination
  // to divert funds from, and gating the very first signup behind a 48h delay
  // would block new creators from their first payout.
  const isFirstTimeSetup = !profile?.payoutDetails

  const activatesAt = new Date(Date.now() + (isFirstTimeSetup ? 0 : PAYOUT_COOLDOWN_MS))

  // Revoke any earlier pending change — only one in flight at a time.
  await prisma.payoutSettingChange.updateMany({
    where: { userId, appliedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  const change = await prisma.payoutSettingChange.create({
    data: {
      userId,
      previousPayoutMethod: profile?.payoutMethod ?? null,
      newPayoutMethod: payoutMethod,
      newPayoutDetails: encryptedDetails,
      newBeneficiaryId: beneficiaryId,
      newPayoutCountry: payoutCountry ?? null,
      newPayoutCurrency: payoutCurrency ?? null,
      activatesAt,
      appliedAt: isFirstTimeSetup ? new Date() : null,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    },
  })

  if (isFirstTimeSetup) {
    // No cooldown on first setup: write straight to profile.
    await prisma.creatorProfile.update({
      where: { userId },
      data: {
        payoutMethod,
        payoutCountry: payoutCountry ?? null,
        payoutCurrency: payoutCurrency ?? null,
        payoutDetails: encryptedDetails,
        ...(beneficiaryId ? { airwallexBeneficiaryId: beneficiaryId } : {}),
      },
    })
  }

  // ── Audit + email — always, even on first setup ────────────────────────────
  await prisma.auditEvent.create({
    data: {
      actorId: null, // actor is the user themselves, not a staff user
      actorName: userRow.name ?? userRow.email,
      action: isFirstTimeSetup ? 'payouts.destination.set' : 'payouts.destination.change_requested',
      entityType: 'CreatorProfile',
      entityId: userId,
      entityLabel: `payoutMethod=${payoutMethod}${payoutCountry ? `, country=${payoutCountry}` : ''}`,
      reason: isFirstTimeSetup
        ? 'Initial payout destination setup'
        : `Pending activation at ${activatesAt.toISOString()}`,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    },
  }).catch((err: unknown) => console.error('[payout/settings]', err))

  // Notify the on-file email. Even if the attacker controls the current session,
  // this email goes to the address Airwallex/Resend have on file, which the
  // attacker shouldn't control unless they also took over the email account.
  const subject = isFirstTimeSetup
    ? 'Payout destination set — noizu.direct'
    : 'Your payout destination is pending activation — noizu.direct'
  const bodyHtml = isFirstTimeSetup
    ? `<p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Payout destination set</p>
       <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
         Hi ${userRow.name ?? 'there'}, your payout destination (${payoutMethod.replace(/_/g, ' ')}) has been configured.
         If you didn't do this, reply to this email right away.
       </p>`
    : `<p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Payout destination change pending</p>
       <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
         Hi ${userRow.name ?? 'there'}, a change to your payout destination was just requested. It will activate on
         <strong style="color:#e5e5f0;">${activatesAt.toUTCString()}</strong> (≈ 48 hours from now).
       </p>
       <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
         If you didn't request this, contact support immediately. A revoke link will be available in your dashboard.
       </p>
       <p style="margin:0;font-size:12px;color:#6b6b7a;">Change reference: ${change.id}</p>`

  try {
    await resend.emails.send({
      from: 'noizu.direct <noreply@noizu.direct>',
      to: [userRow.email],
      subject,
      html: emailShell(bodyHtml),
    })
    await prisma.emailLog.create({
      data: {
        to: userRow.email,
        subject,
        type: 'payout_destination_change',
        status: 'sent',
      },
    }).catch(() => {})
  } catch (e) {
    await prisma.emailLog.create({
      data: {
        to: userRow.email,
        subject,
        type: 'payout_destination_change',
        status: 'failed',
        error: String(e),
      },
    }).catch(() => {})
  }

  // TODO(H4-follow-up): expose a revoke endpoint at `/api/dashboard/payout/settings/revoke`
  // that flips `revokedAt` on the pending change and emits an audit event. Deferred
  // from this batch to keep scope tight; the change can still be revoked directly
  // by an admin in the interim.

  return NextResponse.json({
    ok: true,
    pending: !isFirstTimeSetup,
    activatesAt: activatesAt.toISOString(),
    changeId: change.id,
  })
}
