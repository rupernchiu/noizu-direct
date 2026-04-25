import { NextResponse } from 'next/server'
import { runEscrowProcessor } from '@/lib/escrow-processor'
import { isCronAuthorized } from '@/lib/cron-auth'
import { withCronHeartbeat } from '@/lib/cron-heartbeat'

export async function POST(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const results = await withCronHeartbeat('escrow-processor', () => runEscrowProcessor())
  return NextResponse.json({ ok: true, ...results })
}

// Vercel cron schedulers only invoke GET by default — mirror POST behaviour.
export async function GET(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const results = await withCronHeartbeat('escrow-processor', () => runEscrowProcessor())
  return NextResponse.json({ ok: true, ...results })
}
