import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/messages/lookup?username=sakura_arts
// Returns the creator's userId + display info so the messages page can start a new conversation
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })

  const profile = await prisma.creatorProfile.findUnique({
    where: { username },
    select: { userId: true, displayName: true, avatar: true, username: true },
  })

  if (!profile) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

  return NextResponse.json({
    userId:      profile.userId,
    username:    profile.username,
    displayName: profile.displayName,
    avatar:      profile.avatar,
  })
}
