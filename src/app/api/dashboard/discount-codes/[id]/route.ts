import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creator = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!creator) return NextResponse.json({ error: 'Not a creator' }, { status: 403 })

  const { id } = await params

  const code = await prisma.discountCode.findUnique({ where: { id }, select: { creatorId: true } })
  if (!code) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (code.creatorId !== creator.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.discountCode.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
