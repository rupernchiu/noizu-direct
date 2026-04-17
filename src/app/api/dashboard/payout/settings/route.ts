import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { createBeneficiary } from '@/lib/airwallex'
import crypto from 'crypto'

const KEY = Buffer.from(
  (process.env.PAYOUT_ENCRYPTION_KEY ?? 'placeholder_32_char_encryption_key').padEnd(32, '0').slice(0, 32)
)

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt(text: string): string {
  try {
    const [ivHex, encHex] = text.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const enc = Buffer.from(encHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
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
      const details = JSON.parse(decrypt(profile.payoutDetails)) as Record<string, string>
      if (details.accountNumber) {
        maskedAccount = '····' + details.accountNumber.slice(-4)
      } else if (details.paypalEmail) {
        const [local, domain] = details.paypalEmail.split('@')
        maskedAccount = local.slice(0, 2) + '···@' + domain
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

    encryptedDetails = encrypt(JSON.stringify({ accountName, bankName, accountNumber, routingCode, swiftCode }))
  } else if (payoutMethod === 'paypal') {
    const { paypalEmail } = body
    if (!paypalEmail) return NextResponse.json({ error: 'PayPal email is required' }, { status: 400 })
    encryptedDetails = encrypt(JSON.stringify({ paypalEmail }))
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
