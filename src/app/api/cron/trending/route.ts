// Schedule: runs every 6 hours
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { calculateTrending } from '@/lib/trendingCalculator'
import { invalidateCache, invalidatePattern, CACHE_KEYS } from '@/lib/redis'

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (
    req.headers.get('authorization') === `Bearer ${secret}` ||
    req.headers.get('x-cron-secret') === secret
  )
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
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
  if (!isAuthorized(req)) {
    const session = await auth()
    const isAdmin = session && (session.user as any).role === 'ADMIN'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await calculateTrending()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/trending] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
