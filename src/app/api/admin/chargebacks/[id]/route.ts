import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { status?: string; adminNotes?: string; outcome?: string }

  const updated = await prisma.chargebackDispute.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.adminNotes !== undefined ? { adminNotes: body.adminNotes } : {}),
      ...(body.outcome ? { outcome: body.outcome } : {}),
    },
  })

  return NextResponse.json(updated)
}
