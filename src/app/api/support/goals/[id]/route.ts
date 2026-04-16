import { NextResponse } from 'next/server'
import { requireCreator, getOwnedByCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const goal = await getOwnedByCreator((session.user as any).id, (creatorId) =>
    prisma.supportGoal.findFirst({ where: { id, creatorId } })
  )
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json() as Partial<{
    title: string; description: string; targetAmountUsd: number
    currentAmountUsd: number; deadline: string | null; status: string; coverImage: string
  }>

  const updated = await prisma.supportGoal.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.targetAmountUsd !== undefined && { targetAmountUsd: body.targetAmountUsd }),
      ...(body.currentAmountUsd !== undefined && { currentAmountUsd: body.currentAmountUsd }),
      ...(body.deadline !== undefined && { deadline: body.deadline ? new Date(body.deadline) : null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const goal = await getOwnedByCreator((session.user as any).id, (creatorId) =>
    prisma.supportGoal.findFirst({ where: { id, creatorId } })
  )
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.supportGoal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
