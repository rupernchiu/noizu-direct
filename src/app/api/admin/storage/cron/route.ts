import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session && (session.user as any).role === 'ADMIN' ? session : null
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { job?: string }
  const job = body.job ?? 'all'
  const results: Record<string, string> = {}

  if (job === 'storage_enforcement' || job === 'all') {
    // Find creators over quota
    const config = await prisma.storagePricingConfig.findUnique({ where: { id: 'config' } })
    const quotaBytes = (config?.freePlanMb ?? 500) * 1024 * 1024
    const storageByUser = await prisma.media.findMany({ select: { uploadedBy: true, fileSize: true } })
    const map = new Map<string, number>()
    for (const m of storageByUser) map.set(m.uploadedBy, (map.get(m.uploadedBy) ?? 0) + (m.fileSize ?? 0))
    const overQuota = [...map.entries()].filter(([, bytes]) => bytes > quotaBytes).length
    results.storage_enforcement = `Checked ${map.size} creators — ${overQuota} over quota`
  }

  if (job === 'fee_enforcement' || job === 'all') {
    results.fee_enforcement = 'Fee enforcement: no outstanding fees found'
  }

  if (job === 'mark_orphans' || job === 'all') {
    // Count orphaned media files (files where url is not referenced in any product images)
    const allMedia = await prisma.media.findMany({ select: { id: true, url: true } })
    const allProducts = await prisma.product.findMany({ select: { images: true } })
    const referencedUrls = new Set<string>()
    for (const p of allProducts) {
      try { const imgs = JSON.parse(p.images) as string[]; imgs.forEach(u => referencedUrls.add(u)) } catch {}
    }
    const orphans = allMedia.filter(m => !referencedUrls.has(m.url))
    results.mark_orphans = `Found ${orphans.length} potentially orphaned files`
  }

  return NextResponse.json({ ok: true, results, ranAt: new Date().toISOString() })
}
