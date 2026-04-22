// Private file serving — requires authentication.
// Files in R2 private/ prefix are NEVER served directly.
// This route checks authorization before streaming bytes through Next.
//
// Authorization rules:
//   identity           → admin only (ID documents)
//   dispute-evidence   → admin only (for prototype; extend later per dispute ownership)
//   message-attachment → sender or receiver of the underlying Message only

import { auth } from '@/lib/auth'
import { getR2Object } from '@/lib/r2'
import { prisma } from '@/lib/prisma'
import { Readable } from 'stream'

// H5 — private categories MUST stream bytes through Next instead of 307-redirecting
// to a presigned R2 URL. Redirecting leaks the signed URL into browser history,
// any page Referer, and R2 access logs.
const STREAMED_PRIVATE_CATEGORIES = new Set(['identity', 'dispute-evidence', 'message-attachment'])

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
  const userId = (session.user as { id: string }).id
  const isAdmin = (session.user as { role?: string }).role === 'ADMIN'

  // ── Path traversal guard ───────────────────────────────────────────────────
  if (segments.some(s => s === '..' || s === '.' || s === '')) {
    return new Response('Bad Request', { status: 400 })
  }

  // ── Authorization ──────────────────────────────────────────────────────────
  if (category === 'identity') {
    if (!isAdmin) return new Response('Forbidden', { status: 403 })
  } else if (category === 'dispute-evidence') {
    if (!isAdmin) return new Response('Forbidden', { status: 403 })
  } else if (category === 'message-attachment') {
    // H14 — IDOR fix. Only the sender/receiver of the Message that owns this
    // attachment may read it. We look up the Message by its stored viewer URL
    // (imageUrl) — which matches this exact path — then assert membership.
    const viewerUrl = `/api/files/${filePath}`
    const message = await prisma.message.findFirst({
      where: {
        OR: [{ imageUrl: viewerUrl }, { attachments: { contains: viewerUrl } }],
      },
      select: { senderId: true, receiverId: true },
    })
    if (!message) return new Response('Not Found', { status: 404 })
    if (message.senderId !== userId && message.receiverId !== userId && !isAdmin) {
      return new Response('Forbidden', { status: 403 })
    }
  } else {
    // Unknown private category — deny
    return new Response('Forbidden', { status: 403 })
  }

  // ── Serve bytes ────────────────────────────────────────────────────────────
  const r2Key = `private/${filePath}`

  // For streamed private categories: pipe bytes through, never redirect.
  if (STREAMED_PRIVATE_CATEGORIES.has(category)) {
    try {
      const obj = await getR2Object(r2Key, 'private')
      const body = obj.Body as Readable | undefined
      if (!body) return new Response('Not Found', { status: 404 })

      // Cast Node Readable → Web ReadableStream. AWS SDK types this as a
      // SdkStream which is compatible with `Readable.toWeb` at runtime.
      const web = Readable.toWeb(body as Readable) as unknown as ReadableStream<Uint8Array>

      // Dispute evidence downloads are a little more aggressive — force
      // attachment so admins reviewing evidence don't accidentally inline
      // a PDF with active JS.
      const disposition = category === 'dispute-evidence' ? 'attachment' : 'inline'

      const headers = new Headers({
        'Content-Type': obj.ContentType ?? 'application/octet-stream',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      })
      if (obj.ContentLength) headers.set('Content-Length', String(obj.ContentLength))

      return new Response(web, { headers })
    } catch (err) {
      console.warn('[files] stream failed', {
        category,
        keyPreview: r2Key.slice(0, 64),
        err: (err as Error).message,
      })
      return new Response('Not Found', { status: 404 })
    }
  }

  // Non-private / unknown: we already fell through to deny above, so this is
  // effectively unreachable. Kept as a belt-and-braces 404.
  return new Response('Not Found', { status: 404 })
}
