import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { invalidateCache, CACHE_KEYS } from '@/lib/redis'

const FLOAT_FIELDS = [
  'processingFeePercent',
  'platformFeePercent',
  'withdrawalFeePercent',
  'creatorCommissionPercent',
  'buyerFeeLocalPercent',
  'buyerFeeCardPercent',
  'defaultCreatorTaxRatePercent',
] as const

const INT_FIELDS = [
  'digitalEscrowHours',
  'physicalEscrowDays',
  'podEscrowDays',
  'commissionEscrowDays',
  'newCreatorEscrowExtraDays',
  'newCreatorTransactionThreshold',
  'clawbackExposureWindowDays',
  'topCreatorThreshold',
] as const

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed: Record<string, unknown> = {}

  for (const k of FLOAT_FIELDS) {
    const v = body[k]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      allowed[k] = v
    }
  }
  for (const k of INT_FIELDS) {
    const v = body[k]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      allowed[k] = Math.round(v)
    }
  }

  // Tax destination countries: must parse as a plain JSON object keyed by
  // country code with boolean values. Reject anything else so we never store
  // an array or non-object payload that downstream tax logic would choke on.
  if (typeof body.taxDestinationCountries === 'string') {
    let parsed: unknown
    try {
      parsed = JSON.parse(body.taxDestinationCountries)
    } catch {
      return NextResponse.json({ error: 'taxDestinationCountries must be valid JSON' }, { status: 400 })
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'taxDestinationCountries must be a JSON object' }, { status: 400 })
    }
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^[A-Z]{2}$/.test(key)) {
        return NextResponse.json({ error: `taxDestinationCountries: "${key}" is not a valid ISO-3166 alpha-2 code` }, { status: 400 })
      }
      if (typeof val !== 'boolean') {
        return NextResponse.json({ error: `taxDestinationCountries.${key} must be true or false` }, { status: 400 })
      }
    }
    allowed.taxDestinationCountries = JSON.stringify(parsed)
  }

  await prisma.platformSettings.updateMany({ data: allowed })
  await invalidateCache(CACHE_KEYS.platformSettings)

  const settings = await prisma.platformSettings.findFirst()
  return NextResponse.json(settings)
}
