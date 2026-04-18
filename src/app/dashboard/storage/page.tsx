import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StorageClient } from './StorageClient'
import type { StorageFile, StorageBreakdown } from '@/app/api/creator/storage/route'

export const metadata = { title: 'Storage Manager | noizu.direct' }

export default async function StoragePage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id as string
  const email  = (session.user as any).email as string

  // Fetch data directly on server
  const [mediaFiles, creatorProfile, products] = await Promise.all([
    prisma.media.findMany({ where: { uploadedBy: userId }, orderBy: { createdAt: 'desc' } }),
    prisma.creatorProfile.findFirst({ where: { userId } }),
    prisma.product.findMany({
      where: { creator: { userId } },
      select: { id: true, title: true, images: true },
    }),
  ])

  const messages = await prisma.message.findMany({
    where: { senderId: userId },
    select: { attachments: true, imageUrl: true },
  })

  // Build reference maps
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
  for (const m of messages) {
    if (m.imageUrl) messageUrls.add(m.imageUrl)
    try { (JSON.parse(m.attachments) as Array<{ url: string }>).forEach(a => { if (a.url) messageUrls.add(a.url) }) } catch {}
  }

  const files: StorageFile[] = mediaFiles.map(f => {
    const isPdf = f.mimeType === 'application/pdf' || f.filename.toLowerCase().endsWith('.pdf')
    let category: StorageFile['category'] = 'orphaned'
    let attachedTo: string | null = null
    if (productImageMap.has(f.url))  { category = isPdf ? 'pdf' : 'product_image'; attachedTo = productImageMap.get(f.url)! }
    else if (portfolioUrls.has(f.url)) { category = isPdf ? 'pdf' : 'portfolio'; attachedTo = 'Portfolio' }
    else if (profileUrls.has(f.url))   { category = 'profile'; attachedTo = 'Profile' }
    else if (messageUrls.has(f.url))   { category = isPdf ? 'pdf' : 'message'; attachedTo = 'Message attachment' }
    return { id: f.id, filename: f.filename, url: f.url, fileSize: f.fileSize ?? 0, mimeType: f.mimeType, createdAt: f.createdAt.toISOString(), category, attachedTo }
  })

  const cats = ['product_image', 'portfolio', 'message', 'pdf', 'profile', 'orphaned'] as const
  const breakdown: StorageBreakdown = cats.reduce((acc, cat) => {
    const cf = files.filter(f => f.category === cat)
    acc[cat] = { bytes: cf.reduce((s, f) => s + f.fileSize, 0), count: cf.length }
    return acc
  }, {} as StorageBreakdown)

  const totalBytes   = files.reduce((s, f) => s + f.fileSize, 0)
  const quotaBytes   = 500 * 1024 * 1024
  const usagePercent = quotaBytes > 0 ? Math.min(100, Math.round((totalBytes / quotaBytes) * 100)) : 0

  return (
    <StorageClient
      initialFiles={files}
      breakdown={breakdown}
      totalBytes={totalBytes}
      quotaBytes={quotaBytes}
      usagePercent={usagePercent}
      plan="FREE"
      config={{
        freePlanMb:           500,
        proPlanGb:            5,
        proPlanPriceCents:    999,
        studioPlanGb:         20,
        studioPlanPriceCents: 1999,
        topup1gbCents:        299,
        topup5gbCents:        999,
        topup10gbCents:       1799,
        gracePeriodDays:      7,
        warningThreshold1:    80,
        warningThreshold2:    95,
      }}
      userEmail={email}
    />
  )
}
