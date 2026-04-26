import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StorageClient } from './StorageClient'
import { getUserQuota } from '@/lib/storage-quota'
import type { StorageFile, StorageBreakdown } from '@/app/api/creator/storage/route'

export const metadata = { title: 'Storage Manager' }

export default async function StoragePage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as { id: string }).id
  const email  = (session.user as { email: string }).email

  const [mediaFiles, creatorProfile, products, config, quota] = await Promise.all([
    prisma.media.findMany({ where: { uploadedBy: userId }, orderBy: { createdAt: 'desc' } }),
    prisma.creatorProfile.findFirst({ where: { userId } }),
    prisma.product.findMany({
      where: { creator: { userId } },
      select: { id: true, title: true, images: true },
    }),
    prisma.storagePricingConfig.findUnique({ where: { id: 'config' } }),
    getUserQuota(userId),
  ])

  const ticketAttachments = await prisma.ticketAttachment.findMany({
    where: { uploaderId: userId },
    select: { viewerUrl: true },
  })

  const productImageMap = new Map<string, string>()
  for (const p of products) {
    try { (JSON.parse(p.images) as string[]).forEach(url => productImageMap.set(url, p.title)) } catch {}
  }
  const portfolioUrls = new Set<string>()
  if (creatorProfile?.portfolioItems) {
    try {
      const items = JSON.parse(creatorProfile.portfolioItems) as Array<{ url?: string; imageUrl?: string }>
      items.forEach(i => { if (i.url) portfolioUrls.add(i.url); if (i.imageUrl) portfolioUrls.add(i.imageUrl) })
    } catch {}
  }
  const profileUrls = new Set<string>()
  if (creatorProfile?.avatar)      profileUrls.add(creatorProfile.avatar)
  if (creatorProfile?.bannerImage) profileUrls.add(creatorProfile.bannerImage)
  if (creatorProfile?.logoImage)   profileUrls.add(creatorProfile.logoImage)

  const messageUrls = new Set<string>()
  for (const a of ticketAttachments) {
    if (a.viewerUrl) messageUrls.add(a.viewerUrl)
  }

  const files: StorageFile[] = mediaFiles.map(f => {
    const isPdf = f.mimeType === 'application/pdf' || f.filename.toLowerCase().endsWith('.pdf')
    let category: StorageFile['category'] = 'orphaned'
    let attachedTo: string | null = null
    if (productImageMap.has(f.url))  { category = isPdf ? 'pdf' : 'product_image'; attachedTo = productImageMap.get(f.url)! }
    else if (portfolioUrls.has(f.url)) { category = isPdf ? 'pdf' : 'portfolio'; attachedTo = 'Portfolio' }
    else if (profileUrls.has(f.url))   { category = 'profile'; attachedTo = 'Profile' }
    else if (messageUrls.has(f.url))   { category = isPdf ? 'pdf' : 'message'; attachedTo = 'Ticket attachment' }
    return { id: f.id, filename: f.filename, url: f.url, fileSize: f.fileSize ?? 0, mimeType: f.mimeType, createdAt: f.createdAt.toISOString(), category, attachedTo }
  })

  const cats = ['product_image', 'portfolio', 'message', 'pdf', 'profile', 'orphaned'] as const
  const breakdown: StorageBreakdown = cats.reduce((acc, cat) => {
    const cf = files.filter(f => f.category === cat)
    acc[cat] = { bytes: cf.reduce((s, f) => s + f.fileSize, 0), count: cf.length }
    return acc
  }, {} as StorageBreakdown)

  const totalBytes   = files.reduce((s, f) => s + f.fileSize, 0)
  const usagePercent = quota.quotaBytes > 0 ? Math.min(100, Math.round((totalBytes / quota.quotaBytes) * 100)) : 0

  return (
    <StorageClient
      initialFiles={files}
      breakdown={breakdown}
      totalBytes={totalBytes}
      quotaBytes={quota.quotaBytes}
      usagePercent={usagePercent}
      plan={quota.plan as 'FREE' | 'CREATOR' | 'PRO'}
      bonusBytes={quota.bonusBytes}
      config={{
        freePlanMb:            config?.freePlanMb ?? 2048,
        creatorPlanGb:         config?.creatorPlanGb ?? 25,
        creatorPlanPriceCents: config?.creatorPlanPriceCents ?? 690,
        proPlanGb:             config?.proPlanGb ?? 100,
        proPlanPriceCents:     config?.proPlanPriceCents ?? 1490,
        overageCentsPerGb:     config?.overageCentsPerGb ?? 8,
        overageGracePercent:   quota.overagePercent,
        gracePeriodDays:       config?.gracePeriodDays ?? 7,
        warningThreshold1:     config?.warningThreshold1 ?? 80,
        warningThreshold2:     config?.warningThreshold2 ?? 95,
      }}
      userEmail={email}
    />
  )
}
