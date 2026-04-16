import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const [user, orders, wishlist, following] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true, createdAt: true } }),
    prisma.order.findMany({ where: { buyerId: userId }, select: { id: true, status: true, amountUsd: true, createdAt: true } }),
    prisma.wishlistItem.findMany({ where: { buyerId: userId }, select: { productId: true, addedAt: true } }),
    prisma.creatorFollow.findMany({ where: { buyerId: userId }, select: { creatorId: true, followedAt: true } }),
  ])

  const exportData = { exportedAt: new Date().toISOString(), user, orders, wishlist, following }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="noizu-direct-export-${userId.slice(0, 8)}.json"`,
    },
  })
}
