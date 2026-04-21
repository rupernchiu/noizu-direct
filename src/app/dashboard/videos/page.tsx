import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { VideosManager } from './VideosManager'

export default async function VideosPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')

  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) redirect('/dashboard')

  const videos = await prisma.video.findMany({
    where: { creatorId: profile.id },
    orderBy: { order: 'asc' },
  })

  return (
    <VideosManager
      initialVideos={videos.map(v => ({
        id: v.id,
        title: v.title,
        platform: v.platform,
        url: v.url,
        embedId: v.embedId,
        description: v.description ?? null,
        order: v.order,
        isActive: v.isActive,
      }))}
    />
  )
}
