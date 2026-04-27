import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCreatorProfile, unauthorized } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { COUNTRIES, enabledCreatorCountries } from '@/lib/countries'

// Phase 3 of the tax architecture build (2026-04-27 spec, §8 onboarding tax
// qualification). Captures classification + tax-ID + indemnification ack.
// Runs after admin-approved CreatorProfile already exists; pre-populates
// payoutCountry from the creator's chosen country if it isn't set.

const TOS_VERSION = '2026-04-27'

const baseSchema = z.object({
  country: z.string().length(2),
  classification: z.enum(['INDIVIDUAL', 'REGISTERED_BUSINESS']),
  taxId: z.string().trim().max(120).optional(),
  taxJurisdiction: z.string().length(2).optional(),
  ackTosVersion: z.literal(TOS_VERSION),
})

export async function POST(req: NextRequest) {
  const ctx = await requireCreatorProfile()
  if (!ctx) return unauthorized()

  let parsed
  try {
    parsed = baseSchema.safeParse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { country, classification, taxId, taxJurisdiction, ackTosVersion } = parsed.data

  // Country must be one of the Tier-1 / creatorOnboardingEnabled list.
  const enabledIso2 = new Set(enabledCreatorCountries().map((c) => c.iso2))
  if (!enabledIso2.has(country.toUpperCase())) {
    return NextResponse.json(
      { error: 'Selected country is not currently open for creator onboarding.' },
      { status: 400 },
    )
  }

  // For business classification, require tax-ID and a valid jurisdiction.
  let resolvedJurisdiction: string | null = null
  let resolvedTaxId: string | null = null
  if (classification === 'REGISTERED_BUSINESS') {
    if (!taxId || taxId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tax registration ID is required for registered businesses.' },
        { status: 400 },
      )
    }
    const jur = (taxJurisdiction ?? country).toUpperCase()
    if (!COUNTRIES[jur]) {
      return NextResponse.json(
        { error: 'Tax jurisdiction must be a valid country.' },
        { status: 400 },
      )
    }
    resolvedJurisdiction = jur
    resolvedTaxId = taxId.trim()
  }

  const updated = await prisma.creatorProfile.update({
    where: { userId: ctx.userId },
    data: {
      creatorClassification: classification,
      taxId: resolvedTaxId,
      taxJurisdiction: resolvedJurisdiction,
      // Sync payoutCountry from chosen country if not yet set.
      payoutCountry: ctx.profile.payoutCountry ?? country.toUpperCase(),
      taxOnboardingAcknowledgedAt: new Date(),
      taxOnboardingTosVersion: ackTosVersion,
    },
    select: {
      id: true,
      creatorClassification: true,
      taxId: true,
      taxJurisdiction: true,
      payoutCountry: true,
      taxOnboardingAcknowledgedAt: true,
      taxOnboardingTosVersion: true,
    },
  })

  return NextResponse.json({ ok: true, profile: updated })
}
