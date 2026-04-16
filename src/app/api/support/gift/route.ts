import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const creatorId = searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const gift = await prisma.supportGift.findUnique({ where: { creatorId } })
  return NextResponse.json(gift)
}

export async function POST(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

  const body = await req.json() as Partial<{
    isActive: boolean; presetAmounts: number[]; thankYouMessage: string
  }>

  const gift = await prisma.supportGift.upsert({
    where: { creatorId: profile.id },
    update: {
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.presetAmounts !== undefined && { presetAmounts: JSON.stringify(body.presetAmounts) }),
      ...(body.thankYouMessage !== undefined && { thankYouMessage: body.thankYouMessage }),
    },
    create: {
      creatorId: profile.id,
      isActive: body.isActive ?? true,
      presetAmounts: JSON.stringify(body.presetAmounts ?? [3, 5, 10, 25]),
      thankYouMessage: body.thankYouMessage ?? 'Thank you for your support!',
    },
  })
  return NextResponse.json(gift)
}
