import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface SignatureInput {
  templateId: string
  signedName: string
}

interface SignBody {
  signatures: SignatureInput[]
  agreedToAll: boolean
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = (session.user as any).role
  if (role !== 'CREATOR' && role !== 'BUYER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: SignBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { signatures, agreedToAll } = body

  if (!agreedToAll) {
    return NextResponse.json({ error: 'agreedToAll must be true' }, { status: 400 })
  }
  if (!Array.isArray(signatures) || signatures.length === 0) {
    return NextResponse.json({ error: 'signatures must be a non-empty array' }, { status: 400 })
  }

  for (const sig of signatures) {
    if (typeof sig.templateId !== 'string' || !sig.templateId.trim()) {
      return NextResponse.json({ error: 'Each signature must have a valid templateId' }, { status: 400 })
    }
    if (typeof sig.signedName !== 'string' || !sig.signedName.trim()) {
      return NextResponse.json({ error: 'Each signature must have a non-empty signedName' }, { status: 400 })
    }
  }

  const templateIds = signatures.map((s) => s.templateId)

  const activeTemplates = await prisma.agreementTemplate.findMany({
    where: { id: { in: templateIds }, isActive: true },
  })

  if (activeTemplates.length !== templateIds.length) {
    const foundIds = new Set(activeTemplates.map((t) => t.id))
    const missing = templateIds.filter((id) => !foundIds.has(id))
    return NextResponse.json(
      { error: 'One or more template IDs are invalid or inactive', missing },
      { status: 422 },
    )
  }

  const templateMap = new Map(activeTemplates.map((t) => [t.id, t]))

  // Derive client IP
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'

  const userAgent = req.headers.get('user-agent') ?? ''
  const agreedAt = new Date()
  const userId = session.user.id

  let signed = 0

  try {
    await prisma.$transaction(async (tx) => {
      for (const sig of signatures) {
        const template = templateMap.get(sig.templateId)!

        await tx.creatorAgreement.updateMany({
          where: { userId, templateId: sig.templateId, isActive: true },
          data: { isActive: false },
        })

        await tx.creatorAgreement.create({
          data: {
            userId,
            templateId: sig.templateId,
            agreementType: template.type,
            agreementVersion: template.version,
            agreedAt,
            ipAddress,
            userAgent,
            signedName: sig.signedName.trim(),
            agreementSnapshot: template.content,
            isActive: true,
          },
        })

        signed++
      }

      await tx.user.update({
        where: { id: userId },
        data: { agreementsLastCheckedAt: agreedAt },
      })
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Database error'
    console.error('[agreements/sign] transaction failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ ok: true, signed })
}
