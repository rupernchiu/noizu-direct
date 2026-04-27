import { NextResponse } from 'next/server'
import { requireCreatorProfile } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

// Lightweight listings index for dashboard pages that need to render a list of
// the creator's own products. /dashboard/shipping is the first consumer; it
// passes shippingOnly=1 to get just PHYSICAL/POD rows.

export async function GET(req: Request) {
  const guard = await requireCreatorProfile()
  if (!guard) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { profile } = guard

  const url = new URL(req.url)
  const shippingOnly = url.searchParams.get('shippingOnly') === '1'

  const listings = await prisma.product.findMany({
    where: {
      creatorId: profile.id,
      ...(shippingOnly ? { type: { in: ['PHYSICAL', 'POD'] } } : {}),
    },
    select: {
      id: true,
      title: true,
      type: true,
      isActive: true,
      shippingByCountry: true,
    },
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
  })

  return NextResponse.json({ listings })
}
