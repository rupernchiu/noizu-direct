import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StorefrontMessagesManager } from './StorefrontMessagesManager'

export default async function StorefrontMessagesPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')

  const userId = (session.user as any).id as string

  const profile = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true, displayName: true } })
  if (!profile) redirect('/')

  const entries = await prisma.creatorGuestbook.findMany({
    where: { creatorProfileId: profile.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, content: true, rating: true, status: true, createdAt: true, author: { select: { name: true } } },
  })

  return (
    <StorefrontMessagesManager
      initialMessages={entries.map(e => ({
        id: e.id,
        authorName: e.author.name,
        content: e.content,
        rating: e.rating ?? undefined,
        createdAt: e.createdAt.toISOString(),
        status: e.status,
      }))}
    />
  )
}
