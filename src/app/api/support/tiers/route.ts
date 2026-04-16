import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const creatorId = searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const tiers = await prisma.supportTier.findMany({
    where: { creatorId, isActive: true },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(tiers)
}

export async function POST(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

  const count = await prisma.supportTier.count({ where: { creatorId: profile.id } })
  if (count >= 3) return NextResponse.json({ error: 'Maximum 3 tiers allowed' }, { status: 400 })

  const body = await req.json() as { name: string; priceUsd: number; perks: string[]; description?: string }

  const tier = await prisma.supportTier.create({
    data: {
      creatorId: profile.id,
      name: body.name,
      description: body.description ?? null,
      priceUsd: body.priceUsd,
      perks: JSON.stringify(body.perks ?? []),
      order: count,
    },
  })
  return NextResponse.json(tier)
}
