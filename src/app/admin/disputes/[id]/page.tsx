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

  // DisputeEvidence rows (new schema). Show live and superseded separately.
  const [liveEvidence, supersededEvidence] = await Promise.all([
    prisma.disputeEvidence.findMany({
      where: { disputeId: id, supersededAt: null },
      orderBy: { uploadedAt: 'asc' },
    }),
    prisma.disputeEvidence.findMany({
      where: { disputeId: id, supersededAt: { not: null } },
      orderBy: { uploadedAt: 'asc' },
    }),
  ])

  const uploaderIds = Array.from(
    new Set(
      [...liveEvidence, ...supersededEvidence].map((e) => e.uploaderId).filter((id): id is string => !!id),
    ),
  )
  const uploaders = uploaderIds.length
    ? await prisma.user.findMany({
        where: { id: { in: uploaderIds } },
        select: { id: true, name: true, email: true },
      })
    : []
  const uploaderById = Object.fromEntries(
    uploaders.map((u) => [u.id, { id: u.id, name: u.name, email: u.email }]),
  )

  function toDto(ev: typeof liveEvidence[number]) {
    return {
      id: ev.id,
      disputeId: ev.disputeId,
      uploaderId: ev.uploaderId,
      role: ev.role,
      r2Key: ev.r2Key,
      viewerUrl: ev.viewerUrl,
      mimeType: ev.mimeType,
      fileSize: ev.fileSize,
      note: ev.note,
      uploadedAt: ev.uploadedAt,
      supersededAt: ev.supersededAt,
      supersededBy: ev.supersededBy,
      uploader: ev.uploaderId ? uploaderById[ev.uploaderId] ?? null : null,
    }
  }

  return (
    <DisputeDetailClient
      dispute={dispute}
      liveEvidence={liveEvidence.map(toDto)}
      supersededEvidence={supersededEvidence.map(toDto)}
    />
  )
}
