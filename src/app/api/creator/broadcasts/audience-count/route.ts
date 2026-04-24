import { NextResponse } from 'next/server'
import { requireCreatorProfile } from '@/lib/guards'
import { getAudienceCount, canCreatorBroadcast } from '@/lib/broadcasts'

// GET /api/creator/broadcasts/audience-count
// Returns the reach for both audience tiers plus the creator's current cap
// status, so the compose UI can show counts and any "blocked — daily cap" hints
// without a second round-trip.
export async function GET() {
  const guard = await requireCreatorProfile()
  if (!guard) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [allFollowers, subscribersOnly, eligibility] = await Promise.all([
    getAudienceCount(guard.profile.id, 'ALL_FOLLOWERS'),
    getAudienceCount(guard.profile.id, 'SUBSCRIBERS_ONLY'),
    canCreatorBroadcast(guard.profile.id),
  ])

  return NextResponse.json({
    allFollowers,
    subscribersOnly,
    eligibility,
  })
}
