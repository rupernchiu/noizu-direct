import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) return NextResponse.json({ error: 'No creator profile' }, { status: 404 })
  const provider = await prisma.creatorPodProvider.findUnique({ where: { id } })
  if (!provider || provider.creatorId !== profile.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json() as Record<string, unknown>
  if (body.isDefault) {
    await prisma.creatorPodProvider.updateMany({ where: { creatorId: profile.id }, data: { isDefault: false } })
  }
  const updated = await prisma.creatorPodProvider.update({ where: { id }, data: body as Parameters<typeof prisma.creatorPodProvider.update>[0]['data'] })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) return NextResponse.json({ error: 'No creator profile' }, { status: 404 })
  const provider = await prisma.creatorPodProvider.findUnique({ where: { id } })
  if (!provider || provider.creatorId !== profile.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.creatorPodProvider.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
