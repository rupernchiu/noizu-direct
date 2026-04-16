import { NextResponse } from 'next/server'
import { requireCreatorProfile } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const guard = await requireCreatorProfile()
  if (!guard) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { profile } = guard
  return NextResponse.json({
    popupEnabled:     profile.popupEnabled,
    popupTitle:       profile.popupTitle,
    popupDescription: profile.popupDescription,
    popupCtaText:     profile.popupCtaText,
    popupCtaLink:     profile.popupCtaLink,
    popupBadgeText:   profile.popupBadgeText,
  })
}

export async function PATCH(req: Request) {
  const guard = await requireCreatorProfile()
  if (!guard) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { profile } = guard

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.popupEnabled     !== undefined) data.popupEnabled     = Boolean(body.popupEnabled)
  if (body.popupTitle       !== undefined) data.popupTitle       = body.popupTitle?.trim()       || null
  if (body.popupDescription !== undefined) data.popupDescription = body.popupDescription?.trim() || null
  if (body.popupCtaText     !== undefined) data.popupCtaText     = body.popupCtaText?.trim()     || null
  if (body.popupCtaLink     !== undefined) data.popupCtaLink     = body.popupCtaLink?.trim()     || null
  if (body.popupBadgeText   !== undefined) data.popupBadgeText   = body.popupBadgeText?.trim()   || null
  if ('popupImageUrl'         in body)     data.popupImageUrl    = body.popupImageUrl             || null

  const updated = await prisma.creatorProfile.update({ where: { id: profile.id }, data })
  return NextResponse.json({
    popupEnabled:     updated.popupEnabled,
    popupTitle:       updated.popupTitle,
    popupDescription: updated.popupDescription,
    popupCtaText:     updated.popupCtaText,
    popupCtaLink:     updated.popupCtaLink,
    popupBadgeText:   updated.popupBadgeText,
  })
}
