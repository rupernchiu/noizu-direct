import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { canCreatorBroadcast, getAudienceCount } from '@/lib/broadcasts'
import { BroadcastComposer } from './BroadcastComposer'

export default async function ComposeBroadcastPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id as string

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true, username: true, displayName: true, avatar: true },
  })
  if (!profile) redirect('/dashboard')

  const [allFollowers, subscribersOnly, eligibility] = await Promise.all([
    getAudienceCount(profile.id, 'ALL_FOLLOWERS'),
    getAudienceCount(profile.id, 'SUBSCRIBERS_ONLY'),
    canCreatorBroadcast(profile.id),
  ])

  if (!eligibility.ok) {
    // Hit cap — bounce back to the list which shows the banner.
    redirect('/dashboard/broadcasts')
  }

  return (
    <BroadcastComposer
      creator={{
        username: profile.username,
        displayName: profile.displayName,
        avatar: profile.avatar,
      }}
      audienceCounts={{ allFollowers, subscribersOnly }}
    />
  )
}
