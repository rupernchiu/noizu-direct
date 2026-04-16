import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as { isActive?: boolean }

  await prisma.staffUser.update({
    where: { id },
    data: { isActive: body.isActive },
  })

  return NextResponse.json({ ok: true })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as {
    name?: string; email?: string; department?: string | null
    isActive?: boolean; isSuperAdmin?: boolean; newPassword?: string | null
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined)       data.name = body.name
  if (body.email !== undefined)      data.email = body.email.toLowerCase().trim()
  if ('department' in body)          data.department = body.department
  if (body.isActive !== undefined)   data.isActive = body.isActive
  if (body.isSuperAdmin !== undefined) data.isSuperAdmin = body.isSuperAdmin
  if (body.newPassword) {
    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    data.passwordHash = await bcrypt.hash(body.newPassword, 12)
  }

  await prisma.staffUser.update({ where: { id }, data })

  return NextResponse.json({ ok: true })
}
