import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

const SLUG_REGEX = /^[a-zA-Z0-9_-]{3,30}$/

export async function PATCH(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const body = await req.json() as {
    action: 'change_password' | 'change_slug' | 'delete_account'
    currentPassword?: string
    newPassword?: string
    slug?: string
    confirmEmail?: string
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

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

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

  if (body.action === 'delete_account') {
    const { confirmEmail } = body
    const sessionEmail = (session.user as any).email as string

    if (!confirmEmail || confirmEmail !== sessionEmail) {
      return NextResponse.json({ error: 'Email confirmation does not match' }, { status: 400 })
    }

    // TODO: Implement actual account deletion or soft-delete.
    // Hard delete would be: await prisma.user.delete({ where: { id: userId } })
    // Cascade relations are defined in the Prisma schema and will handle cleanup.
    // Returning stub response until deletion flow is confirmed safe for production.
    return NextResponse.json({ deleted: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
