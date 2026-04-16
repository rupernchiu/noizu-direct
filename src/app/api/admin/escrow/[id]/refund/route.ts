import { NextRequest, NextResponse } from 'next/server'
import { refundEscrow } from '@/lib/escrow-processor'
import { requireAdmin } from '@/lib/guards'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { amount, note } = await req.json() as { amount: number; note?: string }
  await refundEscrow(id, amount, (session.user as any).id as string, note)
  return NextResponse.json({ ok: true })
}
