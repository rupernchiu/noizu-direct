import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const allowed: Record<string, unknown> = {}
  if (typeof body.isActive === 'boolean') allowed.isActive = body.isActive
  if (typeof body.content === 'string') allowed.content = body.content

  const section = await prisma.section.update({ where: { id }, data: allowed })
  return NextResponse.json(section)
}
