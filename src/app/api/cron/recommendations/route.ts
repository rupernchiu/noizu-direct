// Schedule: runs once daily at 3am
import { NextResponse } from 'next/server'
import { computeRecommendations } from '@/lib/recommendationCalculator'
import { isCronAuthorized } from '@/lib/cron-auth'

export async function GET(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await computeRecommendations()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/recommendations] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await computeRecommendations()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/recommendations] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
