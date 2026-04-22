import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getR2SignedUrl } from '@/lib/r2'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'

const PAID_STATUSES = new Set(['PAID', 'PROCESSING', 'DELIVERED', 'COMPLETED'])

// H11 — token lifetime policy.
// - 30-day window is still enforced via Order.downloadExpiry (webhook sets this).
// - Per-token cap: at most DOWNLOAD_CAP successful signed redirects.
//   Past that, 410 Gone — buyer must contact support or re-purchase.
//
// TODO(H11 follow-up, Agent B's scope): on user password change, null out
// Order.downloadToken and mint a fresh one so a leaked token doesn't outlive
// the credential compromise.
const DOWNLOAD_CAP = 10

interface DigitalFile {
  key: string
  filename: string
  size: number
  mime: string
}

// Response shape hardening — return the same 404 body for "no such token"
// and "not your token" so an attacker can't probe token validity.
const NOT_FOUND = () => new Response('Not found', { status: 404 })

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const url = new URL(req.url)
  const idxParam = url.searchParams.get('idx')

  const session = await auth()
  const userId = session?.user ? (session.user as { id: string }).id : null
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const order = await prisma.order.findFirst({
    where: { downloadToken: token },
    include: { product: true },
  })

  // H11 — collapse "not found" and "forbidden" into the same 404.
  if (!order) return NOT_FOUND()
  if (order.buyerId !== userId) return NOT_FOUND()

  if (!order.downloadExpiry || order.downloadExpiry < new Date()) {
    return new Response('Download link expired', { status: 410 })
  }
  if (!PAID_STATUSES.has(order.status)) {
    return new Response('Order not paid', { status: 402 })
  }

  // H11 — per-token download cap. `downloadCount` column is populated by the
  // migration shipped alongside this change; if the migration has not been
  // applied, `order.downloadCount` is undefined at runtime and the OR
  // fallback to 0 lets downloads proceed (the cap will start enforcing after
  // migration).
  const currentCount = order.downloadCount ?? 0
  if (currentCount >= DOWNLOAD_CAP) {
    return new Response('Download limit reached', { status: 410 })
  }

  // Multi-file path: digitalFiles JSON array takes precedence
  const digitalFilesJson = (order.product as { digitalFiles?: string | null }).digitalFiles
  if (digitalFilesJson) {
    let files: DigitalFile[] = []
    try { files = JSON.parse(digitalFilesJson) as DigitalFile[] } catch { files = [] }
    if (files.length > 0) {
      const idx = idxParam ? parseInt(idxParam, 10) : 0
      if (Number.isNaN(idx) || idx < 0 || idx >= files.length) {
        return new Response('Invalid file index', { status: 400 })
      }
      const file = files[idx]

      // ── C1 defense in depth ─────────────────────────────────────────────
      // Even though POST/PATCH /api/products validates the key at write
      // time, re-reject here: a stale product row or a skipped validation
      // (future route bug) must not be able to sign arbitrary R2 keys.
      if (typeof file.key !== 'string' || !file.key.startsWith('digital/')) {
        console.warn('[download] rejected non-digital/ key', {
          orderId: order.id,
          keyPreview: typeof file.key === 'string' ? file.key.slice(0, 32) : null,
        })
        return new Response('File unavailable', { status: 410 })
      }

      // H7 — force `Content-Disposition: attachment` so the signed URL
      // always downloads instead of previewing/executing inline.
      const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'download'
      const signed = await getR2SignedUrl(file.key, 300, {
        visibility: 'private',
        contentDisposition: `attachment; filename="${safeName}"`,
      })

      // Only increment after we've decided to redirect.
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { downloadCount: { increment: 1 } },
        })
      } catch {
        // If the column doesn't exist yet (pre-migration), don't block the
        // download — the cap will start enforcing after migration.
      }

      return Response.redirect(signed, 302)
    }
  }

  // Legacy single-file fallback
  const filePath = order.product.digitalFile
  if (!filePath) return new Response('No file attached to this product', { status: 404 })

  const filename = order.product.title.replace(/[^a-z0-9_\-. ]/gi, '_')

  if (!filePath.startsWith('/') && !filePath.startsWith('http')) {
    if (!filePath.startsWith('digital/')) {
      return new Response('File unavailable', { status: 410 })
    }
    const signed = await getR2SignedUrl(filePath, 300, {
      visibility: 'private',
      contentDisposition: `attachment; filename="${filename}"`,
    })
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: { downloadCount: { increment: 1 } },
      })
    } catch { /* pre-migration */ }
    return Response.redirect(signed, 302)
  }

  const normalised = filePath.startsWith('/') ? filePath.slice(1) : filePath
  const publicRoot = join(process.cwd(), 'public')
  const abs = join(publicRoot, normalised)

  if (!abs.startsWith(publicRoot + '/') && abs !== publicRoot) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const size = statSync(abs).size
    const nodeStream = createReadStream(abs)
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: { downloadCount: { increment: 1 } },
      })
    } catch { /* pre-migration */ }
    return new Response(webStream, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(size),
      },
    })
  } catch {
    return new Response('File not found on server', { status: 404 })
  }
}
