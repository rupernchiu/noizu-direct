import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Users, Megaphone } from 'lucide-react'
import { FollowingClient } from './FollowingClient'
import { BroadcastFeed } from './BroadcastFeed'

// `?tab=broadcasts` switches to the feed; any other value (or missing) shows
// the creators tab. No client-side tab switching — keeps each tab's data fetch
// strictly server-side and lets the browser Back button work.
type TabKey = 'creators' | 'broadcasts'

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id as string

  const params = await searchParams
  const tab: TabKey = params.tab === 'broadcasts' ? 'broadcasts' : 'creators'

  // We always fetch the counts so the tab labels can show them. Each tab's
  // full payload only loads when that tab is active.
  const [followCount, unreadBroadcasts] = await Promise.all([
    prisma.creatorFollow.count({ where: { buyerId: userId } }),
    prisma.broadcastNotification.count({
      where: { recipientId: userId, deletedAt: null, readAt: null },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Following</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creators you follow and the announcements they've sent you.
        </p>
      </div>

      <nav className="flex gap-1 border-b border-border">
        <TabLink
          href="/account/following"
          active={tab === 'creators'}
          Icon={Users}
          label="Creators"
          badge={followCount}
        />
        <TabLink
          href="/account/following?tab=broadcasts"
          active={tab === 'broadcasts'}
          Icon={Megaphone}
          label="Broadcasts"
          badge={unreadBroadcasts}
          badgeTone="attention"
        />
      </nav>

      {tab === 'creators' ? (
        <CreatorsTab userId={userId} />
      ) : (
        <BroadcastsTab userId={userId} />
      )}
    </div>
  )
}

function TabLink({
  href,
  active,
  Icon,
  label,
  badge,
  badgeTone = 'neutral',
}: {
  href: string
  active: boolean
  Icon: React.ElementType
  label: string
  badge: number
  badgeTone?: 'neutral' | 'attention'
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="size-4" />
      {label}
      {badge > 0 && (
        <span
          className={`rounded-full px-1.5 text-xs font-semibold ${
            badgeTone === 'attention' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

async function CreatorsTab({ userId }: { userId: string }) {
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
          _count: { select: { products: true } },
        },
      },
    },
    orderBy: { followedAt: 'desc' },
  })

  return <FollowingClient following={following} />
}

async function BroadcastsTab({ userId }: { userId: string }) {
  const rows = await prisma.broadcastNotification.findMany({
    where: { recipientId: userId, deletedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 20,
    select: {
      id: true,
      readAt: true,
      createdAt: true,
      broadcast: {
        select: {
          id: true,
          title: true,
          body: true,
          template: true,
          audience: true,
          imageKey: true,
          ctaText: true,
          ctaUrl: true,
          createdAt: true,
          creator: {
            select: {
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      },
    },
  })

  const initial = rows.map(r => ({
    notificationId: r.id,
    readAt: r.readAt,
    createdAt: r.createdAt,
    broadcast: r.broadcast,
  }))

  return <BroadcastFeed initial={initial} />
}
