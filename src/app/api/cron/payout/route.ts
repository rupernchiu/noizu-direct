// Schedule: every Friday 2am UTC (10am MYT) via GitHub Actions
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { executeTransfer, getCurrencyFactor } from '@/lib/airwallex'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://noizu.direct'

// USD 10.00 minimum in cents
const MIN_USD_CENTS = 1000

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (
    req.headers.get('authorization') === `Bearer ${secret}` ||
    req.headers.get('x-cron-secret') === secret
  )
}

async function getUsdRate(to: string): Promise<number> {
  if (to === 'USD') return 1
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=USD&to=${to}`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) return 1
  const data = await res.json() as { rates: Record<string, number> }
  return data.rates[to] ?? 1
}

function emailShell(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding-bottom:32px;text-align:center;"><img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" /></td></tr>
<tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">${body}</td></tr>
<tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#4b4b5a;">noizu.direct &mdash; Creator marketplace for SEA creators</p></td></tr>
</table></td></tr></table></body></html>`
}

async function runPayoutSweep() {
  // Find all creators with COMPLETED transactions
  const completedByCreator = await prisma.transaction.groupBy({
    by: ['creatorId'],
    where: { status: 'COMPLETED' },
    _sum: { creatorAmount: true },
  })

  // Find total already paid per creator
  const paidByCreator = await prisma.payout.groupBy({
    by: ['creatorId'],
    where: { status: { in: ['PENDING', 'PROCESSING', 'PAID'] } },
    _sum: { amountUsd: true },
  })

  const paidMap = new Map(paidByCreator.map(p => [p.creatorId, p._sum.amountUsd ?? 0]))

  let processed = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of completedByCreator) {
    const totalEarned = row._sum.creatorAmount ?? 0
    const totalPaid = paidMap.get(row.creatorId) ?? 0
    const availableUsd = totalEarned - totalPaid

    // Below USD 10 minimum
    if (availableUsd < MIN_USD_CENTS) { skipped++; continue }

    // Already has a pending payout
    const hasPending = await prisma.payout.findFirst({
      where: { creatorId: row.creatorId, status: { in: ['PENDING', 'PROCESSING'] } },
    })
    if (hasPending) { skipped++; continue }

    // Load creator profile for payout details
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: row.creatorId },
      select: {
        payoutMethod: true,
        payoutDetails: true,
        payoutCurrency: true,
        payoutCountry: true,
        airwallexBeneficiaryId: true,
      },
    })
    const user = await prisma.user.findUnique({
      where: { id: row.creatorId },
      select: { email: true, name: true, payoutFrozen: true, payoutFrozenReason: true },
    })

    if (!profile?.payoutDetails || !user) { skipped++; continue }
    if (user.payoutFrozen) { skipped++; continue }

    const payoutCurrency = profile.payoutCurrency ?? 'USD'
    const rate = await getUsdRate(payoutCurrency)
    const factor = getCurrencyFactor(payoutCurrency)
    // Convert USD cents to payout currency minor units
    const displayAmount = Math.round((availableUsd / 100) * rate * factor)

    try {
      // Create payout record first
      const payout = await prisma.payout.create({
        data: {
          creatorId: row.creatorId,
          amountUsd: availableUsd,
          currency: payoutCurrency,
          status: 'PROCESSING',
          processedAt: new Date(),
          payoutMethod: profile.payoutMethod ?? 'bank_transfer',
          accountDetails: profile.payoutDetails,
        },
      })

      if (profile.payoutMethod === 'bank_transfer' && profile.airwallexBeneficiaryId) {
        const transfer = await executeTransfer({
          beneficiaryId: profile.airwallexBeneficiaryId,
          amount: displayAmount,
          currency: payoutCurrency,
          payoutId: payout.id,
        })
        await prisma.payout.update({
          where: { id: payout.id },
          data: { airwallexTransferId: transfer.transfer_id ?? transfer.id },
        })
      } else {
        // PayPal or unsupported — leave as PROCESSING for manual follow-up
        await prisma.payout.update({
          where: { id: payout.id },
          data: { adminNote: 'Requires manual PayPal transfer' },
        })
      }

      // Notify creator
      const localAmount = factor === 1
        ? displayAmount.toLocaleString()
        : (displayAmount / 100).toFixed(2)

      const html = emailShell(`
        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Your payout is on the way 🎉</p>
        <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
          Hi ${user.name ?? 'there'}, we're processing your payout of
          <strong style="color:#e5e5f0;">${payoutCurrency} ${localAmount}</strong>
          (≈ USD ${(availableUsd / 100).toFixed(2)}).
          Funds typically arrive within 1–3 business days.
        </p>
        <a href="${baseUrl}/dashboard/earnings" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View Earnings</a>
      `)
      await resend.emails.send({
        from: 'noizu.direct <noreply@noizu.direct>',
        to: [user.email],
        subject: `Payout of ${payoutCurrency} ${localAmount} is on the way — noizu.direct`,
        html,
      }).catch((err: unknown) => console.error('[cron/payout]', err))

      processed++
    } catch (e) {
      errors.push(`creator ${row.creatorId}: ${(e as Error).message}`)
    }
  }

  return { processed, skipped, errors }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await runPayoutSweep())
  } catch (e) {
    console.error('[cron/payout]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await runPayoutSweep())
  } catch (e) {
    console.error('[cron/payout]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
