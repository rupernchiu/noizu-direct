// Private file serving — requires authentication.
// Files in R2 private/ prefix are NEVER served directly.
// This route checks authorization before redirecting to a presigned R2 URL.
//
// Authorization rules:
//   identity         → admin only (ID documents)
//   dispute-evidence → admin only (for prototype; extend later per dispute ownership)
//   message-attachment → any authenticated user (extend later per message ownership)

import { auth } from '@/lib/auth'
import { getR2SignedUrl } from '@/lib/r2'

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
  // Ensure no path traversal components in the segments
  if (segments.some(s => s === '..' || s === '.')) {
    return new Response('Bad Request', { status: 400 })
  }

  // ── Serve via R2 presigned URL ─────────────────────────────────────────────
  try {
    const signedUrl = await getR2SignedUrl(`private/${filePath}`, 300)
    return Response.redirect(signedUrl, 307)
  } catch {
    return new Response('Not Found', { status: 404 })
  }
}
