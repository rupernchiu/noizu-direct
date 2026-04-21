import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserQuota } from '@/lib/storage-quota'

export interface StorageFile {
  id: string
  filename: string
  url: string
  fileSize: number
  mimeType: string | null
  createdAt: string
  category: 'product_image' | 'portfolio' | 'message' | 'pdf' | 'profile' | 'orphaned'
  attachedTo: string | null
}

export interface StorageBreakdown {
  product_image: { bytes: number; count: number }
  portfolio:     { bytes: number; count: number }
  message:       { bytes: number; count: number }
  pdf:           { bytes: number; count: number }
  profile:       { bytes: number; count: number }
  orphaned:      { bytes: number; count: number }
}

function buildBreakdown(files: StorageFile[]): StorageBreakdown {
  const cats = ['product_image', 'portfolio', 'message', 'pdf', 'profile', 'orphaned'] as const
  return cats.reduce((acc, cat) => {
    const cf = files.filter(f => f.category === cat)
    acc[cat] = { bytes: cf.reduce((s, f) => s + f.fileSize, 0), count: cf.length }
    return acc
  }, {} as StorageBreakdown)
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string

  const [mediaFiles, creatorProfile, products, config] = await Promise.all([
    prisma.media.findMany({ where: { uploadedBy: userId }, orderBy: { createdAt: 'desc' } }),
    prisma.creatorProfile.findFirst({ where: { userId } }),
    prisma.product.findMany({
      where: { creator: { userId } },
      select: { id: true, title: true, images: true },
    }),
    prisma.storagePricingConfig.findUnique({ where: { id: 'config' } }),
  ])

  const messages = await prisma.message.findMany({
    where: { senderId: userId },
    select: { attachments: true, imageUrl: true },
  })

  // Build reference maps
  const productImageMap = new Map<string, string>()
  for (const p of products) {
    try {
      const imgs = JSON.parse(p.images) as string[]
      imgs.forEach(url => productImageMap.set(url, p.title))
    } catch {}
  }

  const portfolioUrls = new Set<string>()
  if (creatorProfile?.portfolioItems) {
    try {
      const items = JSON.parse(creatorProfile.portfolioItems) as Array<{ url?: string; imageUrl?: string }>
      items.forEach(item => {
        if (item.url) portfolioUrls.add(item.url)
        if (item.imageUrl) portfolioUrls.add(item.imageUrl)
      })
    } catch {}
  }

  const profileUrls = new Set<string>()
  if (creatorProfile?.avatar)      profileUrls.add(creatorProfile.avatar)
  if (creatorProfile?.bannerImage) profileUrls.add(creatorProfile.bannerImage)
  if (creatorProfile?.logoImage)   profileUrls.add(creatorProfile.logoImage)

  const messageUrls = new Set<string>()
  for (const m of messages) {
    if (m.imageUrl) messageUrls.add(m.imageUrl)
    try {
      const atts = JSON.parse(m.attachments) as Array<{ url: string }>
      atts.forEach(a => { if (a.url) messageUrls.add(a.url) })
    } catch {}
  }

  const files: StorageFile[] = mediaFiles.map(f => {
    const isPdf = f.mimeType === 'application/pdf' || f.filename.toLowerCase().endsWith('.pdf')

    let category: StorageFile['category'] = 'orphaned'
    let attachedTo: string | null = null

    if (productImageMap.has(f.url)) {
      category = isPdf ? 'pdf' : 'product_image'
      attachedTo = productImageMap.get(f.url)!
    } else if (portfolioUrls.has(f.url)) {
      category = isPdf ? 'pdf' : 'portfolio'
      attachedTo = 'Portfolio'
    } else if (profileUrls.has(f.url)) {
      category = 'profile'
      attachedTo = 'Profile'
    } else if (messageUrls.has(f.url)) {
      category = isPdf ? 'pdf' : 'message'
      attachedTo = 'Message attachment'
    }

    return {
      id: f.id,
      filename: f.filename,
      url: f.url,
      fileSize: f.fileSize ?? 0,
      mimeType: f.mimeType,
      createdAt: f.createdAt.toISOString(),
      category,
      attachedTo,
    }
  })

  const totalBytes = files.reduce((s, f) => s + f.fileSize, 0)
  const quota = await getUserQuota(userId)
  const usagePercent = quota.quotaBytes > 0 ? Math.min(100, Math.round((totalBytes / quota.quotaBytes) * 100)) : 0

  return NextResponse.json({
    totalBytes,
    quotaBytes: quota.quotaBytes,
    baseBytes: quota.baseBytes,
    bonusBytes: quota.bonusBytes,
    hardLimitBytes: quota.hardLimitBytes,
    overagePercent: quota.overagePercent,
    usagePercent,
    plan: quota.plan,
    files,
    breakdown: buildBreakdown(files),
    config: config ?? null,
  })
}
