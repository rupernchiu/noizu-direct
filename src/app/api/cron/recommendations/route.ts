// Schedule: runs once daily at 3am
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { computeRecommendations } from '@/lib/recommendationCalculator'

export async function POST(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    // authorized via cron secret
  } else {
    const session = await auth()
    const isAdmin = session && (session.user as any).role === 'ADMIN'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await computeRecommendations()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/recommendations] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
