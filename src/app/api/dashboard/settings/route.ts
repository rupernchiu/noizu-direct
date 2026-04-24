import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { BCRYPT_COST, bumpTokenVersion } from '@/lib/auth'

const SLUG_REGEX = /^[a-zA-Z0-9_-]{3,30}$/

export async function PATCH(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const body = await req.json() as {
    action: 'change_password' | 'change_slug' | 'deactivate_store'
    currentPassword?: string
    newPassword?: string
    slug?: string
  }

  if (body.action === 'change_password') {
    const { currentPassword, newPassword } = body
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'currentPassword and newPassword are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_COST)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
    // M12: invalidate every existing session on password change.
    await bumpTokenVersion(userId)

    return NextResponse.json({ success: true })
  }

  if (body.action === 'change_slug') {
    const { slug } = body
    if (!slug || !SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be 3–30 characters and contain only letters, numbers, hyphens, and underscores' },
        { status: 400 }
      )
    }

    const existing = await prisma.creatorProfile.findFirst({ where: { username: slug } })
    if (existing && existing.userId !== userId) {
      return NextResponse.json({ error: 'Slug is already taken' }, { status: 409 })
    }

    const updated = await prisma.creatorProfile.update({
      where: { userId },
      data: { username: slug },
    })

    return NextResponse.json({ username: updated.username })
  }

  if (body.action === 'deactivate_store') {
    await prisma.creatorProfile.update({
      where: { userId },
      data: { isSuspended: true },
    })
    return NextResponse.json({ deactivated: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
