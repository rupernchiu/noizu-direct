import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id as string

  let user: { id: string; name: string; email: string; avatar: string | null; legalFullName: string | null } | null = null
  let profile: {
    id: string; username: string; displayName: string; bio: string | null
    avatar: string | null; bannerImage: string | null; logoImage: string | null
    commissionStatus: string; commissionDescription: string | null
    announcementText: string | null; announcementActive: boolean
    absorbProcessingFee: boolean; categoryTags: string | null; socialLinks: string | null
    isVerified: boolean; isTopCreator: boolean; portfolioItems: string | null
  } | null = null
  let products: { id: string; title: string; type: string }[] = []

  try {
    ;[user, profile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, avatar: true, legalFullName: true },
      }),
      prisma.creatorProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          avatar: true,
          bannerImage: true,
          logoImage: true,
          commissionStatus: true,
          commissionDescription: true,
          announcementText: true,
          announcementActive: true,
          absorbProcessingFee: true,
          categoryTags: true,
          socialLinks: true,
          isVerified: true,
          isTopCreator: true,
          portfolioItems: true,
        },
      }),
    ])

    if (profile) {
      products = await prisma.product.findMany({
        where: { creatorId: profile.id, isActive: true },
        select: { id: true, title: true, type: true },
        orderBy: { createdAt: 'desc' },
      })
    }
  } catch (err) {
    console.error('[/dashboard/profile] Data fetch error:', err)
    throw err
  }

  if (!user || !profile) redirect('/')

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Creator Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, store, and preferences.</p>
      </div>
      <ProfileClient data={{ user, profile, products }} />
    </div>
  )
}
