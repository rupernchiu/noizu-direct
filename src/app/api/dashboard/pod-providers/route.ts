import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function cuid() { return 'p' + Math.random().toString(36).slice(2, 27) }

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) return NextResponse.json({ error: 'No creator profile' }, { status: 404 })
  const providers = await prisma.creatorPodProvider.findMany({
    where: { creatorId: profile.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(providers)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) return NextResponse.json({ error: 'No creator profile' }, { status: 404 })
  const body = await req.json() as {
    name: string; customName?: string; storeUrl?: string; notes?: string;
    isDefault?: boolean; defaultProductionDays?: number;
    shippingMY?: number; shippingSG?: number; shippingPH?: number; shippingIntl?: number;
  }
  if (body.isDefault) {
    await prisma.creatorPodProvider.updateMany({ where: { creatorId: profile.id }, data: { isDefault: false } })
  }
  const provider = await prisma.creatorPodProvider.create({
    data: {
      id: cuid(), creatorId: profile.id,
      name: body.name, customName: body.customName, storeUrl: body.storeUrl, notes: body.notes,
      isDefault: body.isDefault ?? false,
      defaultProductionDays: body.defaultProductionDays ?? 5,
      shippingMY: body.shippingMY ?? 5, shippingSG: body.shippingSG ?? 7,
      shippingPH: body.shippingPH ?? 10, shippingIntl: body.shippingIntl ?? 14,
    },
  })
  return NextResponse.json(provider)
}
