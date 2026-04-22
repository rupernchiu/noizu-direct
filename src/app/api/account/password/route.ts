import { auth, bumpTokenVersion, BCRYPT_COST } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const body = await req.json()
  const { currentPassword, newPassword, confirmPassword } = body

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
  if (!user?.password) {
    return NextResponse.json({ error: 'Unable to verify current password' }, { status: 400 })
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, BCRYPT_COST)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

  // M12: bump tokenVersion so every other tab/device is signed out on the
  // next request. Note: this also invalidates the caller's current JWT;
  // the UI should prompt "Password changed — please log in again" after a
  // successful 200. Simpler and safer than trying to selectively exempt
  // the caller's session.
  await bumpTokenVersion(userId)

  return NextResponse.json({ ok: true })
}
