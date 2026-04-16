import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const notif = await prisma.notification.findUnique({ where: { id } })
  if (!notif || notif.userId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.notification.update({ where: { id }, data: { isRead: true } })
  return NextResponse.json({ ok: true })
}
