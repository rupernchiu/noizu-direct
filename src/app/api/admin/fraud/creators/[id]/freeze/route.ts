import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { freeze: boolean; reason?: string }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      payoutFrozen: body.freeze,
      payoutFrozenReason: body.freeze ? (body.reason ?? 'Admin hold') : null,
    },
    select: { id: true, name: true, payoutFrozen: true, payoutFrozenReason: true },
  })

  return NextResponse.json(updated)
}
