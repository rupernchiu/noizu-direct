import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AnnouncementManager } from './AnnouncementManager'

export default async function AdminAnnouncementsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const serialized = announcements.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Announcements</h2>
      <AnnouncementManager announcements={serialized} />
    </div>
  )
}
