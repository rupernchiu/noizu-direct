import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const body = await req.json() as {
    name?: string
    email?: string
    phone?: string
    avatar?: string
  }

  // Validate email uniqueness if changing
  if (body.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    const existing = await prisma.user.findFirst({ where: { email: body.email } })
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 409 })
    }
  }

  // Update User fields
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.avatar !== undefined && { avatar: body.avatar }),
    },
    select: { id: true, name: true, email: true, avatar: true, phone: true },
  })

  // Sync avatar to CreatorProfile if provided
  if (body.avatar !== undefined) {
    await prisma.creatorProfile.updateMany({
      where: { userId },
      data: { avatar: body.avatar },
    })
  }

  return NextResponse.json(updatedUser)
}
