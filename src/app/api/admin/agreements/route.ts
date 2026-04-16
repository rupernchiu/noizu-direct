import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [templates, totalCreators] = await Promise.all([
    prisma.agreementTemplate.findMany({
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { agreements: true } } },
    }),
    prisma.user.count({ where: { role: 'CREATOR' } }),
  ])

  // Per-type compliance: count distinct users who have signed at least one agreement of each type
  const typeCounts = await prisma.creatorAgreement.groupBy({
    by: ['agreementType'],
    _count: { userId: true },
    where: { isActive: true },
  })

  // Count distinct signers per type
  const perTypeRaw = await Promise.all(
    [...new Set(templates.map((t) => t.type))].map(async (type) => {
      const signed = await prisma.creatorAgreement.findMany({
        where: { agreementType: type, isActive: true },
        select: { userId: true },
        distinct: ['userId'],
      })
      return { type, signed: signed.length }
    }),
  )

  const perType: Record<string, { signed: number; total: number; pct: number }> = {}
  for (const { type, signed } of perTypeRaw) {
    perType[type] = {
      signed,
      total: totalCreators,
      pct: totalCreators > 0 ? Math.round((signed / totalCreators) * 100) : 0,
    }
  }

  return NextResponse.json({
    templates,
    compliance: {
      total_creators: totalCreators,
      per_type: perType,
    },
  })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    type: string
    version: string
    title: string
    content: string
    summary: string
    changeLog?: string
    effectiveDate: string
    isActive?: boolean
  }

  const { type, version, title, content, summary, changeLog, effectiveDate, isActive } = body

  if (!type || !version || !title || !content || !summary || !effectiveDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const template = await prisma.agreementTemplate.create({
    data: {
      type,
      version,
      title,
      content,
      summary,
      changeLog: changeLog ?? null,
      effectiveDate: new Date(effectiveDate),
      isActive: isActive ?? false,
      createdBy: (session.user as any).id,
      publishedAt: isActive ? new Date() : null,
    },
  })

  return NextResponse.json(template, { status: 201 })
}
