import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ count: 0 })

  const count = await prisma.message.count({
    where: { receiverId: userId, isRead: false },
  })

  return NextResponse.json({ count })
}
