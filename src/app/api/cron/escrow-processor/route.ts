import { NextResponse } from 'next/server'
import { runEscrowProcessor } from '@/lib/escrow-processor'
import { requireAdmin } from '@/lib/guards'

export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const results = await runEscrowProcessor()
  return NextResponse.json({ ok: true, ...results })
}
