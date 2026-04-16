import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

export async function GET(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username') ?? ''

  if (!username) {
    return NextResponse.json({ available: false, message: 'Username is required' })
  }

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({
      available: false,
      message: 'Username must be 3–30 characters: lowercase letters, numbers, underscores only',
    })
  }

  const existing = await prisma.creatorProfile.findFirst({ where: { username } })

  if (existing && existing.userId !== userId) {
    return NextResponse.json({ available: false, message: 'Username is already taken' })
  }

  return NextResponse.json({ available: true, message: 'Username is available' })
}
