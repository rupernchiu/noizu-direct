// Schedule: runs once daily at 3am
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { computeRecommendations } from '@/lib/recommendationCalculator'

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
    const result = await computeRecommendations()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/recommendations] Error:', err)
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
    const result = await computeRecommendations()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/recommendations] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
