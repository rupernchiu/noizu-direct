import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [allActiveTemplates, userAgreements] = await Promise.all([
    prisma.agreementTemplate.findMany({
      where: { isActive: true },
      orderBy: { effectiveDate: 'asc' },
    }),
    prisma.creatorAgreement.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { templateId: true },
    }),
  ])

  const signedTemplateIds = new Set(userAgreements.map((a) => a.templateId))

  const unsigned = allActiveTemplates.filter(
    (t) => !signedTemplateIds.has(t.id),
  )

  const now = Date.now()
  const daysSincePublished: Record<string, number> = {}
  for (const t of unsigned) {
    const ref = t.publishedAt ?? t.effectiveDate
    daysSincePublished[t.id] = Math.floor(
      (now - new Date(ref).getTime()) / (1000 * 60 * 60 * 24),
    )
  }

  return NextResponse.json({
    unsigned,
    total: unsigned.length,
    daysSincePublished,
  })
}
