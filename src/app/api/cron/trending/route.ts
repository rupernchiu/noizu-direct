// Schedule: runs every 6 hours
import { NextResponse } from 'next/server'
import { calculateTrending } from '@/lib/trendingCalculator'
import { invalidateCache, invalidatePattern, CACHE_KEYS } from '@/lib/redis'
import { isCronAuthorized } from '@/lib/cron-auth'

export async function GET(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await calculateTrending()
    await Promise.all([
      invalidateCache(CACHE_KEYS.trending),
      invalidatePattern('marketplace:*'),
    ])
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/trending] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await calculateTrending()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/trending] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
