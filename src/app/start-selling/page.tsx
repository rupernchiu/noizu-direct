import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StartSellingClient } from './StartSellingClient'

export default async function StartSellingPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/start-selling')

  const userId = (session.user as any).id as string
  const role = (session.user as any).role as string

  if (role === 'CREATOR') redirect('/dashboard')
  if (role === 'ADMIN') redirect('/admin')

  const application = await prisma.creatorApplication.findUnique({
    where: { userId },
  })

  // No application or still a draft — show the onboarding form
  if (!application || application.status === 'DRAFT') {
    // fall through to render form below
  } else if (application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW') {
    redirect('/start-selling/status')
  } else if (application.status === 'APPROVED') {
    redirect('/dashboard')
  }
  // REJECTED falls through — show form so they can reapply

  const agreements = await prisma.agreementTemplate.findMany({
    where: { isActive: true },
    orderBy: { type: 'asc' },
    select: {
      id: true,
      type: true,
      version: true,
      title: true,
      content: true,
      summary: true,
      changeLog: true,
      effectiveDate: true,
    },
  })

  const serializedAgreements = agreements.map((a) => ({
    ...a,
    effectiveDate: a.effectiveDate.toISOString(),
  }))

  return (
    <StartSellingClient
      agreements={serializedAgreements}
      userEmail={session.user?.email ?? ''}
      userName={session.user?.name ?? ''}
      hasRejectedApp={application?.status === 'REJECTED'}
      rejectionReason={application?.rejectionReason ?? null}
    />
  )
}
