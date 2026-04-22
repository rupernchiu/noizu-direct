import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { resolve, sep } from 'path'

// M10 — path-traversal defence in depth. The `url` value comes from the DB
// (owned by the user via `uploadedBy`), but even DB-sourced strings get
// guard-checked before being handed to `unlink` so that a malicious admin
// row, a migration bug, or an injection elsewhere in the stack can't
// escape the public/uploads root. We require:
//   1. No scheme (`:` is disallowed — blocks `file:`, `\\server\share` UNC)
//   2. No backslash (avoids Windows-path quirks)
//   3. No `..` segment (standard traversal guard)
//   4. Resolved absolute path MUST start with the allowed root
const PUBLIC_ROOT = resolve(process.cwd(), 'public')
const UPLOADS_ROOT = resolve(PUBLIC_ROOT, 'uploads') + sep

function looksLikeSafeRelative(u: string): boolean {
  if (!u.startsWith('/uploads/')) return false
  if (u.includes('..')) return false
  if (u.includes('\\')) return false
  if (u.includes(':')) return false
  return true
}

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
    if (looksLikeSafeRelative(file.url)) {
      try {
        const absolute = resolve(PUBLIC_ROOT, '.' + file.url)
        // Final sandbox check: the resolved path must live under /public/uploads/.
        if (absolute.startsWith(UPLOADS_ROOT)) {
          await unlink(absolute)
        } else {
          console.warn('[bulk-delete] refusing to unlink outside uploads root', {
            userId, fileId: file.id, url: file.url, absolute,
          })
        }
      } catch {
        // Missing file / permission — best-effort, DB delete still proceeds.
      }
    } else {
      console.warn('[bulk-delete] refusing to unlink suspicious url', {
        userId, fileId: file.id, url: file.url,
      })
    }
    deletedBytes += file.fileSize ?? 0
  }

  const ownedIds = files.map(f => f.id)
  await prisma.media.deleteMany({ where: { id: { in: ownedIds } } })

  return NextResponse.json({ ok: true, deleted: ownedIds.length, deletedBytes })
}
