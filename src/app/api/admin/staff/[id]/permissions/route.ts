import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

interface Grant {
  staffPermissionId: string
  expiresAt: string | null
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as { grants?: Grant[] }

  if (!Array.isArray(body.grants)) {
    return NextResponse.json({ error: 'grants must be an array' }, { status: 400 })
  }

  // Verify the staff user exists
  const staffUser = await prisma.staffUser.findUnique({ where: { id }, select: { id: true } })
  if (!staffUser) return NextResponse.json({ error: 'Staff user not found' }, { status: 404 })

  // Replace all grants in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.staffUserPermission.deleteMany({ where: { staffUserId: id } })
    if (body.grants!.length > 0) {
      await tx.staffUserPermission.createMany({
        data: body.grants!.map((g) => ({
          staffUserId: id,
          staffPermissionId: g.staffPermissionId,
          expiresAt: g.expiresAt ? new Date(g.expiresAt) : null,
        })),
      })
    }
  })

  return NextResponse.json({ ok: true })
}
