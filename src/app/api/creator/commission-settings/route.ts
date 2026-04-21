import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  type CommissionDefaults,
  type MilestoneTemplate,
  parseCommissionDefaults,
  validateTemplate,
} from '@/lib/commission-defaults'

type PricingTier = { tier: string; price: number; description: string }

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: {
      commissionStatus:      true,
      commissionSlots:       true,
      commissionDescription: true,
      commissionTerms:       true,
      commissionPricing:     true,
      commissionDefaults:    true,
      absorbProcessingFee:   true,
    },
  })
  if (!profile) return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })

  let pricingTiers: PricingTier[] = []
  try { pricingTiers = JSON.parse(profile.commissionPricing) as PricingTier[] } catch {}

  return NextResponse.json({
    commissionStatus:      profile.commissionStatus,
    commissionSlots:       profile.commissionSlots,
    commissionDescription: profile.commissionDescription,
    commissionTerms:       profile.commissionTerms,
    pricingTiers,
    absorbProcessingFee:   profile.absorbProcessingFee,
    defaults:              parseCommissionDefaults(profile.commissionDefaults),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json() as {
    commissionStatus?: 'OPEN' | 'LIMITED' | 'CLOSED'
    commissionSlots?: number | null
    commissionDescription?: string | null
    commissionTerms?: string | null
    pricingTiers?: PricingTier[]
    absorbProcessingFee?: boolean
    defaults?: CommissionDefaults
  }

  if (body.commissionStatus && !['OPEN', 'LIMITED', 'CLOSED'].includes(body.commissionStatus)) {
    return NextResponse.json({ error: 'Invalid commission status' }, { status: 400 })
  }
  if (body.commissionSlots !== undefined && body.commissionSlots !== null) {
    const s = Number(body.commissionSlots)
    if (!Number.isFinite(s) || s < 0 || s > 999) return NextResponse.json({ error: 'Slots must be 0–999' }, { status: 400 })
  }
  if (body.defaults) {
    const d = body.defaults
    if (d.depositPercent < 0 || d.depositPercent > 100) return NextResponse.json({ error: 'Deposit percent 0–100' }, { status: 400 })
    if (d.revisionsIncluded < 0 || d.revisionsIncluded > 20) return NextResponse.json({ error: 'Revisions 0–20' }, { status: 400 })
    if (d.turnaroundDays < 1 || d.turnaroundDays > 365) return NextResponse.json({ error: 'Turnaround 1–365 days' }, { status: 400 })
    for (const tpl of d.milestoneTemplates as MilestoneTemplate[]) {
      const err = validateTemplate(tpl)
      if (err) return NextResponse.json({ error: `Template "${tpl.name}": ${err}` }, { status: 400 })
    }
  }

  const update: Record<string, unknown> = {}
  if (body.commissionStatus       !== undefined) update.commissionStatus      = body.commissionStatus
  if (body.commissionSlots        !== undefined) update.commissionSlots       = body.commissionSlots
  if (body.commissionDescription  !== undefined) update.commissionDescription = body.commissionDescription
  if (body.commissionTerms        !== undefined) update.commissionTerms       = body.commissionTerms
  if (body.absorbProcessingFee    !== undefined) update.absorbProcessingFee   = body.absorbProcessingFee
  if (body.pricingTiers) {
    const cleaned = body.pricingTiers
      .filter((t) => t.tier.trim())
      .slice(0, 5)
      .map((t) => ({
        tier:        t.tier.trim().slice(0, 60),
        price:       Math.max(0, Math.round(Number(t.price) || 0)),
        description: String(t.description ?? '').slice(0, 300),
      }))
    update.commissionPricing = JSON.stringify(cleaned)
  }
  if (body.defaults) {
    update.commissionDefaults = JSON.stringify(body.defaults)
  }

  await prisma.creatorProfile.update({ where: { userId }, data: update })
  return NextResponse.json({ ok: true })
}
