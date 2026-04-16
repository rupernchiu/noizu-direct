// Admin override: manually create a CreatorAgreement record for a user.
// Used when a creator completed onboarding before the sign flow was fixed,
// or to resolve edge-case compliance gaps during testing.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { userId: string; templateId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, templateId } = body
  if (!userId || !templateId) {
    return NextResponse.json({ error: 'userId and templateId are required' }, { status: 400 })
  }

  const [user, template] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } }),
    prisma.agreementTemplate.findUnique({ where: { id: templateId } }),
  ])

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  if (user.role !== 'CREATOR') {
    return NextResponse.json({ error: 'User is not a CREATOR' }, { status: 422 })
  }

  const adminId = (session.user as any).id ?? 'unknown'
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // Mark any existing active agreement for this template as inactive
    await tx.creatorAgreement.updateMany({
      where: { userId, templateId, isActive: true },
      data: { isActive: false },
    })

    await tx.creatorAgreement.create({
      data: {
        userId,
        templateId,
        agreementType: template.type,
        agreementVersion: template.version,
        agreedAt: now,
        ipAddress: '0.0.0.0',
        userAgent: `Admin force-sign by ${adminId}`,
        signedName: user.name,
        agreementSnapshot: template.content,
        isActive: true,
      },
    })
  })

  return NextResponse.json({ ok: true })
}
