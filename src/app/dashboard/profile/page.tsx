import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from './ProfileForm'

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: {
      username: true,
      displayName: true,
      bio: true,
      avatar: true,
      bannerImage: true,
      logoImage: true,
      commissionStatus: true,
      announcementText: true,
      announcementActive: true,
      absorbProcessingFee: true,
      categoryTags: true,
      socialLinks: true,
      isVerified: true,
      isTopCreator: true,
      portfolioItems: true,
      commissionSlots: true,
      commissionDescription: true,
      commissionTerms: true,
      commissionPricing: true,
    },
  })
  if (!profile) redirect('/')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Creator Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your public profile and store settings</p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  )
}
