import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    name: string; email: string; department?: string | null
    password: string; isSuperAdmin?: boolean
  }

  if (!body.name?.trim() || !body.email?.trim() || !body.password) {
    return NextResponse.json({ error: 'name, email, and password are required' }, { status: 400 })
  }
  if (body.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existing = await prisma.staffUser.findUnique({ where: { email: body.email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'A staff user with that email already exists' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)

  const user = await prisma.staffUser.create({
    data: {
      name: body.name.trim(),
      email: body.email.toLowerCase().trim(),
      department: body.department ?? null,
      passwordHash,
      isSuperAdmin: body.isSuperAdmin ?? false,
    },
  })

  return NextResponse.json({ id: user.id })
}
