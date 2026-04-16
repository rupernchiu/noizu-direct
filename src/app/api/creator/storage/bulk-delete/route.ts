import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const body = await req.json() as { fileIds?: string[] }
  const fileIds = body.fileIds ?? []

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return NextResponse.json({ error: 'No file IDs provided' }, { status: 400 })
  }

  // Only delete files owned by this user
  const files = await prisma.media.findMany({
    where: { id: { in: fileIds }, uploadedBy: userId },
  })

  let deletedBytes = 0
  for (const file of files) {
    if (file.url.startsWith('/uploads/')) {
      try { await unlink(join(process.cwd(), 'public', file.url)) } catch {}
    }
    deletedBytes += file.fileSize ?? 0
  }

  const ownedIds = files.map(f => f.id)
  await prisma.media.deleteMany({ where: { id: { in: ownedIds } } })

  return NextResponse.json({ ok: true, deleted: ownedIds.length, deletedBytes })
}
