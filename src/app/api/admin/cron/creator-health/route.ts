import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { runCreatorHealthCheck } from '@/lib/creatorHealthCheck'

export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const result = await runCreatorHealthCheck()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[admin/cron/creator-health]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
