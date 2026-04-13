import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'CREATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
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
    categoryTags?: string[]
    socialLinks?: Record<string, string>
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
      ...(body.categoryTags !== undefined && { categoryTags: JSON.stringify(body.categoryTags) }),
      ...(body.socialLinks !== undefined && { socialLinks: JSON.stringify(body.socialLinks) }),
    },
  })

  return NextResponse.json(updated)
}
