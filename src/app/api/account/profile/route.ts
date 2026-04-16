import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const body = await req.json()

  // Update email
  if ('email' in body) {
    const { email } = body
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    const trimmed = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    const existing = await prisma.user.findFirst({ where: { email: trimmed, NOT: { id: userId } } })
    if (existing) {
      return NextResponse.json({ error: 'That email is already in use' }, { status: 409 })
    }
    await prisma.user.update({ where: { id: userId }, data: { email: trimmed } })
    return NextResponse.json({ ok: true })
  }

  // Update name
  const { name } = body
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
  }
  await prisma.user.update({ where: { id: userId }, data: { name: name.trim() } })
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename = `${userId}.${ext}`
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
  mkdirSync(uploadsDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  writeFileSync(path.join(uploadsDir, filename), buffer)

  const avatarUrl = `/uploads/avatars/${filename}`
  await prisma.user.update({ where: { id: userId }, data: { avatar: avatarUrl } })

  return NextResponse.json({ ok: true, avatar: avatarUrl })
}
