import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StorefrontMessagesManager } from './StorefrontMessagesManager'

export default async function StorefrontMessagesPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')

  const userId = (session.user as any).id as string

  const messages = await prisma.message.findMany({
    where: { receiverId: userId, orderId: null },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      sender: { select: { name: true } },
    },
  })

  return (
    <StorefrontMessagesManager
      initialMessages={messages.map(m => ({
        id: m.id,
        senderName: m.sender.name,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        displayOrder: m.displayOrder,
      }))}
    />
  )
}
