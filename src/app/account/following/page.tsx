import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FollowingClient } from './FollowingClient'

export default async function FollowingPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const following = await prisma.creatorFollow.findMany({
    where: { buyerId: userId },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          bannerImage: true,
          commissionStatus: true,
          categoryTags: true,
          totalSales: true,
          isVerified: true,
          isTopCreator: true,
          _count: {
            select: { products: true },
          },
        },
      },
    },
    orderBy: { followedAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Following</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Creators you follow — {following.length} creator{following.length !== 1 ? 's' : ''}
        </p>
      </div>

      <FollowingClient following={following} />
    </div>
  )
}
