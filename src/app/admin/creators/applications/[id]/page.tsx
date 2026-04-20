import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ApplicationReviewClient } from './ApplicationReviewClient'

export default async function ApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const { id } = await params

  const application = await prisma.creatorApplication.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, creatorVerificationStatus: true } },
    },
  })
  if (!application) notFound()

  // Fetch signed agreements for this user
  const agreements = await prisma.creatorAgreement.findMany({
    where: { userId: application.userId, isActive: true },
    include: {
      template: { select: { type: true, title: true, version: true, isActive: true } },
    },
    orderBy: { agreedAt: 'desc' },
  })

  // Fetch all active agreement templates so we can show unsigned ones too
  const activeTemplates = await prisma.agreementTemplate.findMany({
    where: { isActive: true },
    select: { id: true, type: true, title: true, version: true },
  })

  return (
    <ApplicationReviewClient
      application={{
        id: application.id,
        userId: application.userId,
        status: application.status,
        displayName: application.displayName,
        username: application.username,
        bio: application.bio,
        categoryTags: application.categoryTags,
        legalFullName: application.legalFullName,
        dateOfBirth: application.dateOfBirth?.toISOString() ?? null,
        nationality: application.nationality,
        country: application.country,
        phone: application.phone,
        idType: application.idType,
        idNumber: application.idNumber,
        idFrontImage: application.idFrontImage ?? null,
        idBackImage: application.idBackImage ?? null,
        selfieImage: application.selfieImage ?? null,
        kycCompleted: application.kycCompleted ?? false,
        bankName: application.bankName,
        bankAccountNumber: application.bankAccountNumber,
        bankAccountName: application.bankAccountName,
        paypalEmail: application.paypalEmail ?? null,
        adminNote: application.adminNote ?? null,
        rejectionReason: application.rejectionReason ?? null,
        submittedAt: application.submittedAt?.toISOString() ?? null,
        reviewedAt: application.reviewedAt?.toISOString() ?? null,
        createdAt: application.createdAt.toISOString(),
        userName: application.user.name,
        userEmail: application.user.email,
      }}
      agreements={agreements.map((a) => ({
        id: a.id,
        type: a.template.type,
        title: a.template.title,
        version: a.agreementVersion,
        signedName: a.signedName,
        agreedAt: a.agreedAt.toISOString(),
        templateIsActive: a.template.isActive,
      }))}
      activeTemplates={activeTemplates}
    />
  )
}
