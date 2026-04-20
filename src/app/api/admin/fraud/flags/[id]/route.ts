import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { status: string; reviewNote?: string }
  const adminName = (session.user as any)?.name ?? 'Admin'

  const updated = await prisma.fraudFlag.update({
    where: { id },
    data: {
      status: body.status,
      reviewedAt: new Date(),
      reviewedBy: adminName,
      ...(body.reviewNote !== undefined ? { reviewNote: body.reviewNote } : {}),
    },
  })

  return NextResponse.json(updated)
}
