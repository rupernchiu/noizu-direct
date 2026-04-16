import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUnreadCount } from '@/lib/notifications'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ count: 0 })
  const count = await getUnreadCount(session.user.id)
  return NextResponse.json({ count })
}
