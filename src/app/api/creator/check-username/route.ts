import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guards'

const USERNAME_REGEX = /^[a-z0-9_]+$/
const MIN_LENGTH = 3
const MAX_LENGTH = 30

export async function GET(req: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const username = (searchParams.get('username') ?? '').trim().toLowerCase()

  if (!username) {
    return NextResponse.json({ available: false, reason: 'Username is required' })
  }

  if (username.length < MIN_LENGTH) {
    return NextResponse.json({
      available: false,
      reason: `Username must be at least ${MIN_LENGTH} characters`,
    })
  }

  if (username.length > MAX_LENGTH) {
    return NextResponse.json({
      available: false,
      reason: `Username must be at most ${MAX_LENGTH} characters`,
    })
  }

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({
      available: false,
      reason: 'Username may only contain lowercase letters, numbers, and underscores',
    })
  }

  const [profileTaken, applicationTaken] = await Promise.all([
    prisma.creatorProfile.findFirst({
      where: { username },
      select: { id: true },
    }),
    prisma.creatorApplication.findFirst({
      where: {
        username,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] },
      },
      select: { id: true },
    }),
  ])

  if (profileTaken || applicationTaken) {
    return NextResponse.json({ available: false, reason: 'Username is already taken' })
  }

  return NextResponse.json({ available: true })
}
