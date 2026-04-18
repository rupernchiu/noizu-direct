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

  const profile = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })

  const entry = await prisma.creatorGuestbook.findUnique({ where: { id }, select: { creatorProfileId: true } })
  if (!entry || entry.creatorProfileId !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.creatorGuestbook.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'CREATOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = (session.user as any).id as string
  const { id } = await params

  const profile = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })

  const entry = await prisma.creatorGuestbook.findUnique({ where: { id }, select: { creatorProfileId: true } })
  if (!entry || entry.creatorProfileId !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { action } = await req.json() as { action?: 'approve' | 'reject' }

  let data: { status: string; isVisible: boolean }
  if (action === 'approve') {
    data = { status: 'APPROVED', isVisible: true }
  } else if (action === 'reject') {
    data = { status: 'REJECTED', isVisible: false }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const updated = await prisma.creatorGuestbook.update({ where: { id }, data })
  return NextResponse.json(updated)
}
