import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const creatorId = searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const goals = await prisma.supportGoal.findMany({
    where: { creatorId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(goals)
}

export async function POST(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

  const body = await req.json() as {
    title: string
    description?: string
    targetAmountUsd: number
    deadline?: string
    coverImage?: string
  }

  const goal = await prisma.supportGoal.create({
    data: {
      creatorId: profile.id,
      title: body.title,
      description: body.description ?? null,
      targetAmountUsd: body.targetAmountUsd,
      deadline: body.deadline ? new Date(body.deadline) : null,
      coverImage: body.coverImage ?? null,
    },
  })
  return NextResponse.json(goal)
}
