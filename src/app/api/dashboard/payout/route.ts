import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { getCreatorBalance } from '@/lib/creator-balance'
import { minimumPayoutUsdCents, rateForCountry, swiftFeeUsdCents } from '@/lib/payout-rail'

const resend = new Resend(process.env.RESEND_API_KEY)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

export async function GET() {
  try {
    const session = await requireCreator()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id as string

    const balance = await getCreatorBalance(userId)
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId },
      select: { payoutCountry: true, payoutRail: true, swiftIntermediaryFeeUsd: true },
    })
    const rail = ((profile?.payoutRail as 'LOCAL' | 'SWIFT' | null) ?? null)
      ?? rateForCountry(profile?.payoutCountry ?? null)
    return NextResponse.json({
      available: balance.availableUsd,
      exposed: balance.exposedUsd,
      escrow: balance.escrowUsd,
      blocked: balance.blockedUsd,
      paidOut: balance.paidOutUsd,
      lifetime: balance.lifetimeUsd,
      exposureWindowDays: balance.exposureWindowDays,
      rail,
      minPayoutUsd: minimumPayoutUsdCents(rail),
      swiftFeeUsd: rail === 'SWIFT' ? swiftFeeUsdCents(profile?.swiftIntermediaryFeeUsd ?? null) : 0,
    })
  } catch (err) {
    console.error('[dashboard/payout GET] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCreator()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id as string

    const { amount } = await req.json() as { amount: number }

    // Per-rail minimum: USD 10 LOCAL, USD 100 SWIFT (tier-3 corridors:
    // VN/KH/MM/LA). Profile may already have payoutRail set; fall back to
    // country-derived rail.
    const profileForRail = await prisma.creatorProfile.findUnique({
      where: { userId },
      select: { payoutCountry: true, payoutRail: true },
    })
    const rail = (profileForRail?.payoutRail as 'LOCAL' | 'SWIFT' | undefined)
      ?? rateForCountry(profileForRail?.payoutCountry ?? null)
    const minCents = minimumPayoutUsdCents(rail)
    if (!amount || amount < minCents) {
      const minUsd = (minCents / 100).toFixed(2)
      const railNote = rail === 'SWIFT'
        ? ' (SWIFT corridor — intermediary bank fees are passed through to you)'
        : ''
      return NextResponse.json({
        error: `Minimum payout is USD ${minUsd}${railNote}`,
      }, { status: 400 })
    }

    // 2. No pending payout
    const existingPending = await prisma.payout.findFirst({
      where: { creatorId: userId, status: 'PENDING' },
    })
    if (existingPending) {
      return NextResponse.json({ error: 'You already have a pending payout request' }, { status: 400 })
    }

    // 3. No open disputes
    const openDisputes = await prisma.dispute.count({
      where: { status: 'OPEN', order: { creatorId: userId } },
    })
    if (openDisputes > 0) {
      return NextResponse.json({ error: 'You have open disputes that must be resolved first' }, { status: 400 })
    }

    // 4. Account status
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId },
    })
    if (!creatorProfile) return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })

    if (creatorProfile.storeStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Your account must be active to request a payout' }, { status: 400 })
    }

    // 5. New creator check: must have KYC verified AND 10+ completed orders, or have a prior PAID payout
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { creatorVerificationStatus: true } })
    const kycVerified = user?.creatorVerificationStatus === 'VERIFIED'
    const settings = await prisma.platformSettings.findFirst()
    const threshold = settings?.newCreatorTransactionThreshold ?? 10
    const completedOrderCount = await prisma.order.count({ where: { creatorId: userId, status: 'COMPLETED' } })
    const graduated = kycVerified && completedOrderCount >= threshold

    if (!graduated) {
      // Allow if they already have a prior successful payout (grandfathered)
      const paidPayoutsCount = await prisma.payout.count({ where: { creatorId: userId, status: 'PAID' } })
      if (paidPayoutsCount === 0) {
        const remaining = Math.max(0, threshold - completedOrderCount)
        const kycMsg = kycVerified ? '' : ' Complete your KYC verification and'
        return NextResponse.json({
          error: `Your account is still in the new creator period.${kycMsg} complete ${remaining} more order${remaining !== 1 ? 's' : ''} before requesting your first payout.`,
        }, { status: 400 })
      }
    }

    // 6. Must have payout details saved
    const hasPayoutDetails =
      creatorProfile.airwallexBeneficiaryId != null ||
      (creatorProfile.payoutMethod === 'paypal' && creatorProfile.payoutDetails != null)
    if (!hasPayoutDetails) {
      return NextResponse.json({ error: 'Please set up your payout details first' }, { status: 400 })
    }

    // 7. Balance check (uses available/exposed split — exposed earnings are
    //    inside the clawback window and not yet payable)
    const balance = await getCreatorBalance(userId)
    if (amount > balance.availableUsd) {
      const exposedFmt = (balance.exposedUsd / 100).toFixed(2)
      return NextResponse.json({
        error: `Insufficient available balance. Earnings from the last ${balance.exposureWindowDays} days (USD ${exposedFmt}) are still chargeback-exposed and not yet payable.`,
      }, { status: 400 })
    }

    const payout = await prisma.payout.create({
      data: {
        creatorId: userId,
        amountUsd: amount,
        status: 'PENDING',
        currency: (creatorProfile as any).payoutCurrency ?? 'MYR',
        payoutMethod: creatorProfile.payoutMethod,
      },
    })

    // Send confirmation email
    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
    if (creator?.email) {
      const email = creator.email
      const subject = 'Payout request received'
      const html = `<p>Hi ${creator.name ?? 'there'},</p><p>Your payout request of RM ${(amount / 100).toFixed(2)} has been received and is being reviewed.</p><p>We will notify you once it has been processed.</p><p>— NOIZU DIRECT</p>`
      const type = 'payout_requested'
      try {
        const { data } = await resend.emails.send({ from: 'noizu.direct <noreply@noizu.direct>', to: [email], subject, html })
        await prisma.emailLog.create({ data: { to: email, subject, type, status: 'sent', resendId: data?.id ?? null } })
      } catch (e) {
        await prisma.emailLog.create({ data: { to: email, subject, type, status: 'failed', error: String(e) } }).catch(() => {})
      }
    }

    return NextResponse.json(payout, { status: 201 })
  } catch (err) {
    console.error('[dashboard/payout POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
