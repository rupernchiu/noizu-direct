import { NextRequest, NextResponse } from 'next/server'
import { releaseEscrow } from '@/lib/escrow-processor'
import { requireAdmin } from '@/lib/guards'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  await releaseEscrow(id, (session.user as any).id as string, 'Admin manual release')
  return NextResponse.json({ ok: true })
}
