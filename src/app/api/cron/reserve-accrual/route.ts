// Schedule: nightly 03:00 UTC. Accrues yesterday's fraud + marketing reserves.
//
// Idempotent: keys off the day stamp embedded in the entry's reason. Re-running
// for the same day is a no-op only if the entry already exists, so we check
// first before depositing.
import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { prisma } from '@/lib/prisma'
import { accrueFraudReserveForDay, accrueMarketingReserveForDay } from '@/lib/reserves'

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Yesterday's UTC window
  const now = new Date()
  const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayStart = new Date(dayEnd.getTime() - 24 * 60 * 60 * 1000)
  const dayStamp = dayStart.toISOString().slice(0, 10)

  // Check for prior runs (idempotency)
  const existing = await prisma.platformReserveEntry.findFirst({
    where: { reason: { contains: dayStamp } },
  })
  if (existing) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Already accrued for ${dayStamp}`,
    })
  }

  const [fraudEntry, marketingEntry] = await Promise.all([
    accrueFraudReserveForDay(dayStart, dayEnd).catch((e: Error) => ({ error: e.message })),
    accrueMarketingReserveForDay(dayStart, dayEnd).catch((e: Error) => ({ error: e.message })),
  ])

  return NextResponse.json({
    ok: true,
    day: dayStamp,
    fraudEntry,
    marketingEntry,
  })
}
