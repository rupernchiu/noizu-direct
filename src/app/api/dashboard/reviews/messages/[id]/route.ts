import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'CREATOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = (session.user as any).id as string
  const { id } = await params

  const message = await prisma.message.findUnique({ where: { id }, select: { receiverId: true } })
  if (!message || message.receiverId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.message.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'CREATOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = (session.user as any).id as string
  const { id } = await params
  const { displayOrder } = await req.json() as { displayOrder: number }

  const message = await prisma.message.findUnique({ where: { id }, select: { receiverId: true } })
  if (!message || message.receiverId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.message.update({ where: { id }, data: { displayOrder } })
  return NextResponse.json(updated)
}
