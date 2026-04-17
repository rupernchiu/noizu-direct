// Schedule: runs once daily at 4am
import { NextRequest, NextResponse } from 'next/server'
import { runCreatorHealthCheck } from '@/lib/creatorHealthCheck'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get('x-cron-secret')

  if (!cronSecret || headerSecret !== cronSecret) {
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
