import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import DisputeDetailClient from './DisputeDetailClient'

export default async function AdminDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (user?.role !== 'ADMIN') redirect('/login')
  const { id } = await params

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          product: { select: { title: true, type: true, images: true } },
          buyer: { select: { name: true, email: true } },
          creator: { select: { name: true, email: true } },
          escrowTransactions: { orderBy: { createdAt: 'asc' } },
        },
      },
      raiser: { select: { name: true, email: true } },
    },
  })
  if (!dispute) notFound()

  return <DisputeDetailClient dispute={dispute} />
}
