import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const body = await req.json()

  // Update avatar — must be a URL returned by /api/upload (validated shape).
  if ('avatar' in body) {
    const { avatar } = body
    if (typeof avatar !== 'string') {
      return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 })
    }
    // Only accept URLs produced by our upload pipeline: absolute HTTPS, or the
    // private-file proxy path. Reject arbitrary strings to prevent an attacker
    // from pointing avatar at a javascript: URL or a third-party HTML they host.
    const isAllowed =
      avatar.startsWith('https://') ||
      avatar.startsWith('/api/files/') ||
      avatar === ''
    if (!isAllowed) {
      return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 })
    }
    await prisma.user.update({ where: { id: userId }, data: { avatar: avatar || null } })
    return NextResponse.json({ ok: true, avatar })
  }

  // Update email
  if ('email' in body) {
    const { email } = body
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    const trimmed = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    const existing = await prisma.user.findFirst({ where: { email: trimmed, NOT: { id: userId } } })
    if (existing) {
      return NextResponse.json({ error: 'That email is already in use' }, { status: 409 })
    }
    await prisma.user.update({ where: { id: userId }, data: { email: trimmed } })
    return NextResponse.json({ ok: true })
  }

  // Update name
  const { name } = body
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
  }
  await prisma.user.update({ where: { id: userId }, data: { name: name.trim() } })
  return NextResponse.json({ ok: true })
}
