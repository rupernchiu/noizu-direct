// Schedule: runs once daily at 4am
import { NextRequest, NextResponse } from 'next/server'
import { runCreatorHealthCheck } from '@/lib/creatorHealthCheck'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (
    req.headers.get('authorization') === `Bearer ${secret}` ||
    req.headers.get('x-cron-secret') === secret
  )
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const result = await runCreatorHealthCheck()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[cron/creator-health]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const result = await runCreatorHealthCheck()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[cron/creator-health]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
