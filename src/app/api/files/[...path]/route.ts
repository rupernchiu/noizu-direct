// Private file serving — requires authentication.
// Files in private-uploads/ are NEVER served directly by Next.js.
// This route checks authorization before streaming file contents.
//
// Authorization rules:
//   identity         → admin only (ID documents)
//   dispute-evidence → admin only (for prototype; extend later per dispute ownership)
//   message-attachment → any authenticated user (extend later per message ownership)

import { auth } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { join, extname, basename, relative, isAbsolute } from 'path'

const CONTENT_TYPES: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  gif:  'image/gif',
  svg:  'image/svg+xml',
  pdf:  'application/pdf',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { path: segments } = await params
  const category = segments[0] // e.g. 'identity', 'dispute-evidence'
  const filePath = segments.join('/')
  const isAdmin  = (session.user as any).role === 'ADMIN'

  // ── Authorization ──────────────────────────────────────────────────────────
  if (category === 'identity') {
    if (!isAdmin) return new Response('Forbidden', { status: 403 })
  } else if (category === 'dispute-evidence') {
    if (!isAdmin) return new Response('Forbidden', { status: 403 })
  } else if (category === 'message-attachment') {
    // Any authenticated user for prototype; tighten per message ownership in production
  } else {
    // Unknown private category — deny
    return new Response('Forbidden', { status: 403 })
  }

  // ── Path traversal guard ───────────────────────────────────────────────────
  // Ensure the resolved path stays inside private-uploads/
  // Uses path.relative() so it works on both Windows (backslash) and Unix.
  const base     = join(process.cwd(), 'private-uploads')
  const absolute = join(base, filePath)
  const rel      = relative(base, absolute)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    return new Response('Bad Request', { status: 400 })
  }

  // ── Serve file ─────────────────────────────────────────────────────────────
  let fileBuffer: Buffer
  try {
    fileBuffer = await readFile(absolute)
  } catch {
    return new Response('Not Found', { status: 404 })
  }

  const ext         = extname(filePath).slice(1).toLowerCase()
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'
  const isPdf       = ext === 'pdf'

  const headers: Record<string, string> = {
    'Content-Type':           contentType,
    'Cache-Control':          'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length':         String(fileBuffer.length),
  }

  if (isPdf) {
    headers['Content-Disposition'] = `attachment; filename="${basename(filePath)}"`
  }

  return new Response(new Uint8Array(fileBuffer), { headers })
}
