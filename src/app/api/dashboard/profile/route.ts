import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

export async function PATCH(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ error: 'No creator profile' }, { status: 404 })

  const body = await req.json() as {
    displayName?: string
    bio?: string
    commissionStatus?: string
    announcementText?: string
    announcementActive?: boolean
    absorbProcessingFee?: boolean
    avatar?: string
    bannerImage?: string
    logoImage?: string
    categoryTags?: string[]
    socialLinks?: Record<string, string>
    portfolioItems?: Array<{ id: string; title: string; description: string; category: string; imageUrl: string; isPublic: boolean }>
    commissionSlots?: number | null
    commissionDescription?: string | null
    commissionTerms?: string | null
    commissionPricing?: Array<{ tier: string; price: number; description: string }>
    username?: string
    themeColor?: string | null
    notifPrefs?: Record<string, unknown>
    sectionOrder?: Array<{ name: string; visible: boolean }>
    featuredProductIds?: string[]
  }

  // Validate username if changing
  if (body.username !== undefined) {
    if (!USERNAME_REGEX.test(body.username)) {
      return NextResponse.json(
        { error: 'Username must be 3–30 characters: lowercase letters, numbers, underscores only' },
        { status: 400 }
      )
    }
    const existing = await prisma.creatorProfile.findFirst({ where: { username: body.username } })
    if (existing && existing.userId !== userId) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }
  }

  const updated = await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: {
      ...(body.displayName !== undefined && { displayName: body.displayName }),
      ...(body.bio !== undefined && { bio: body.bio }),
      ...(body.commissionStatus !== undefined && { commissionStatus: body.commissionStatus }),
      ...(body.announcementText !== undefined && { announcementText: body.announcementText }),
      ...(body.announcementActive !== undefined && { announcementActive: body.announcementActive }),
      ...(body.absorbProcessingFee !== undefined && { absorbProcessingFee: body.absorbProcessingFee }),
      ...(body.avatar !== undefined && { avatar: body.avatar }),
      ...(body.bannerImage !== undefined && { bannerImage: body.bannerImage }),
      ...(body.logoImage !== undefined && { logoImage: body.logoImage }),
      ...(body.categoryTags !== undefined && { categoryTags: JSON.stringify(body.categoryTags) }),
      ...(body.socialLinks !== undefined && { socialLinks: JSON.stringify(body.socialLinks) }),
      ...(body.portfolioItems !== undefined && { portfolioItems: JSON.stringify(body.portfolioItems) }),
      ...(body.commissionSlots !== undefined && { commissionSlots: body.commissionSlots }),
      ...(body.commissionDescription !== undefined && { commissionDescription: body.commissionDescription }),
      ...(body.commissionTerms !== undefined && { commissionTerms: body.commissionTerms }),
      ...(body.commissionPricing !== undefined && { commissionPricing: JSON.stringify(body.commissionPricing) }),
      ...(body.username !== undefined && { username: body.username }),
      ...(body.themeColor !== undefined && { themeColor: body.themeColor }),
      ...(body.notifPrefs !== undefined && { notifPrefs: JSON.stringify(body.notifPrefs) }),
      ...(body.sectionOrder !== undefined && { sectionOrder: JSON.stringify(body.sectionOrder) }),
      ...(body.featuredProductIds !== undefined && { featuredProductIds: JSON.stringify(body.featuredProductIds) }),
    },
  })

  return NextResponse.json(updated)
}
