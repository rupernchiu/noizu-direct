import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PopupManager } from './PopupManager'

export default async function AdminPopupsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const popup = await prisma.popupAd.findFirst({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sitewide Popup</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the homepage popup — fires after 8 seconds or 40% page scroll, once per 24 hours.
        </p>
      </div>

      <PopupManager
        initialPopup={popup ? {
          id:          popup.id,
          title:       popup.title,
          description: popup.description,
          imageUrl:    popup.imageUrl,
          ctaText:     popup.ctaText,
          ctaLink:     popup.ctaLink,
          isActive:    popup.isActive,
          startsAt:    popup.startsAt?.toISOString() ?? null,
          endsAt:      popup.endsAt?.toISOString()   ?? null,
          updatedAt:   popup.updatedAt.toISOString(),
        } : null}
      />
    </div>
  )
}
