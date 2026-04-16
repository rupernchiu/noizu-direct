import { NextResponse } from 'next/server'
import { requireCreator, getOwnedByCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const tier = await getOwnedByCreator((session.user as any).id, (creatorId) =>
    prisma.supportTier.findFirst({ where: { id, creatorId } })
  )
  if (!tier) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json() as Partial<{ name: string; priceUsd: number; perks: string[]; description: string; isActive: boolean; order: number }>

  const updated = await prisma.supportTier.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.priceUsd !== undefined && { priceUsd: body.priceUsd }),
      ...(body.perks !== undefined && { perks: JSON.stringify(body.perks) }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.order !== undefined && { order: body.order }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const tier = await getOwnedByCreator((session.user as any).id, (creatorId) =>
    prisma.supportTier.findFirst({ where: { id, creatorId } })
  )
  if (!tier) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.supportTier.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
