import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PopupSettings } from './PopupSettings'

export default async function DashboardPopupPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')

  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: {
      username: true, displayName: true, avatar: true,
      popupEnabled: true, popupTitle: true, popupDescription: true,
      popupCtaText: true, popupCtaLink: true, popupBadgeText: true,
      popupImageUrl: true,
    },
  })
  if (!profile) redirect('/dashboard')

  const media = await prisma.media.findMany({
    where: { uploadedBy: userId, mimeType: { in: ['image/webp', 'image/jpeg', 'image/png', 'image/gif'] } },
    select: { id: true, url: true, filename: true },
    orderBy: { createdAt: 'desc' },
    take: 48,
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Creator Popup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a popup and floating badge to engage fans visiting your page.
        </p>
      </div>
      <PopupSettings
        username={profile.username}
        displayName={profile.displayName}
        avatar={profile.avatar}
        mediaLibrary={media}
        initialData={{
          popupEnabled:     profile.popupEnabled,
          popupTitle:       profile.popupTitle,
          popupDescription: profile.popupDescription,
          popupCtaText:     profile.popupCtaText,
          popupCtaLink:     profile.popupCtaLink,
          popupBadgeText:   profile.popupBadgeText,
          popupImageUrl:    profile.popupImageUrl,
        }}
      />
    </div>
  )
}
