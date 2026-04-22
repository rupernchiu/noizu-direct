import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { createBeneficiary } from '@/lib/airwallex'
import { encryptPayoutDetails, tryDecryptPayoutDetails } from '@/lib/payout-crypto'

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

  return NextResponse.json({
    payoutMethod: profile.payoutMethod,
    payoutCountry: profile.payoutCountry,
    payoutCurrency: profile.payoutCurrency,
    hasBeneficiary: !!profile.airwallexBeneficiaryId,
    maskedAccount,
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
  }

  const { payoutMethod, payoutCountry, payoutCurrency } = body

  if (!payoutMethod) return NextResponse.json({ error: 'payoutMethod is required' }, { status: 400 })

  let beneficiaryId: string | null = null
  let encryptedDetails: string | null = null

  if (payoutMethod === 'bank_transfer') {
    const { accountName, bankName, accountNumber, routingCode, swiftCode } = body
    if (!accountName || !bankName || !accountNumber || !payoutCountry || !payoutCurrency) {
      return NextResponse.json({ error: 'Account name, bank name, account number, country and currency are required' }, { status: 400 })
    }

    // Create Airwallex beneficiary
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
      // Store details even if Airwallex fails (demo env) — beneficiaryId stays null
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

  return NextResponse.json({ ok: true })
}
