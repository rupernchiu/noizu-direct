import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AgreementDetailClient } from './AgreementDetailClient'

export default async function AdminAgreementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const { id } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1)
  const PER_PAGE = 50

  const template = await prisma.agreementTemplate.findUnique({ where: { id } })
  if (!template) notFound()

  const [totalSigned, signingRecords, allCreators] = await Promise.all([
    prisma.creatorAgreement.count({ where: { templateId: id, isActive: true } }),
    prisma.creatorAgreement.findMany({
      where: { templateId: id, isActive: true },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { agreedAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.user.findMany({
      where: { role: 'CREATOR' },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalSigned / PER_PAGE))

  // Find which creators have NOT signed this template (active agreement).
  // Fetch ALL signer IDs, not just the current page.
  const allSignerIds = await prisma.creatorAgreement.findMany({
    where: { templateId: id, isActive: true },
    select: { userId: true },
  })
  const signedSet = new Set(allSignerIds.map((r) => r.userId))
  const unsignedCreators = allCreators.filter((u) => !signedSet.has(u.id))

  return (
    <AgreementDetailClient
      template={{
        id: template.id,
        type: template.type,
        version: template.version,
        title: template.title,
        content: template.content,
        summary: template.summary,
        changeLog: template.changeLog ?? null,
        effectiveDate: template.effectiveDate.toISOString(),
        isActive: template.isActive,
        publishedAt: template.publishedAt?.toISOString() ?? null,
        createdAt: template.createdAt.toISOString(),
      }}
      signingRecords={signingRecords.map((r) => ({
        id: r.id,
        signedName: r.signedName,
        agreementVersion: r.agreementVersion,
        agreedAt: r.agreedAt.toISOString(),
        ipAddress: r.ipAddress,
        userName: r.user.name,
        userEmail: r.user.email,
      }))}
      totalSigned={totalSigned}
      totalCreators={allCreators.length}
      page={page}
      totalPages={totalPages}
      unsignedCreators={unsignedCreators.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        memberSince: u.createdAt.toISOString(),
      }))}
    />
  )
}
