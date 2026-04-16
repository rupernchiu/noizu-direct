import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const template = await prisma.agreementTemplate.findUnique({
    where: { id },
  })

  if (!template) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const signings = await prisma.creatorAgreement.findMany({
    where: { templateId: id },
    select: {
      id: true,
      userId: true,
      agreedAt: true,
      ipAddress: true,
      signedName: true,
      agreementVersion: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { agreedAt: 'desc' },
  })

  return NextResponse.json({ template, signings })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as {
    isActive?: boolean
    title?: string
    content?: string
    summary?: string
    changeLog?: string
    effectiveDate?: string
  }

  const existing = await prisma.agreementTemplate.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (typeof body.isActive === 'boolean') {
    data.isActive = body.isActive
    // Set publishedAt only when activating and not already published
    if (body.isActive && !existing.publishedAt) {
      data.publishedAt = new Date()
    }
  }
  if (typeof body.title === 'string') data.title = body.title
  if (typeof body.content === 'string') data.content = body.content
  if (typeof body.summary === 'string') data.summary = body.summary
  if (typeof body.changeLog === 'string') data.changeLog = body.changeLog
  if (typeof body.effectiveDate === 'string') data.effectiveDate = new Date(body.effectiveDate)

  const updated = await prisma.agreementTemplate.update({
    where: { id },
    data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const existing = await prisma.agreementTemplate.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.agreementTemplate.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}
