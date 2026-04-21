import { NextResponse } from 'next/server'
import { requireCreator, verifyProductOwnership } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { invalidateCache, invalidatePattern, CACHE_KEYS } from '@/lib/redis'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { id } = await params

  const product = await verifyProductOwnership(id, userId)
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json() as Record<string, unknown>

  const toCentsOrNull = (v: unknown): number | null =>
    v == null ? null : Math.round((v as number) * 100)

  if (body.podProviderId !== undefined && body.podProviderId !== null && body.podProviderId !== '') {
    const provider = await prisma.creatorPodProvider.findFirst({
      where: { id: body.podProviderId as string, creatorId: product.creatorId },
    })
    if (!provider) {
      return NextResponse.json({ error: 'Invalid POD provider' }, { status: 400 })
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title as string }),
      ...(body.description !== undefined && { description: body.description as string }),
      ...(body.price !== undefined && { price: Math.round((body.price as number) * 100) }),
      ...(body.category !== undefined && { category: body.category as string }),
      ...(body.type !== undefined && { type: body.type as string }),
      ...(body.images !== undefined && { images: JSON.stringify(body.images) }),
      ...(body.digitalFiles !== undefined && { digitalFiles: JSON.stringify(body.digitalFiles) }),
      ...(body.stock !== undefined && { stock: body.stock as number }),
      ...(body.isActive !== undefined && { isActive: body.isActive as boolean }),
      ...(body.isPinned !== undefined && { isPinned: body.isPinned as boolean }),
      ...(body.isPreOrder !== undefined && { isPreOrder: body.isPreOrder as boolean }),
      ...(body.preOrderMessage !== undefined && { preOrderMessage: body.preOrderMessage as string | null }),
      ...(body.preOrderReleaseAt !== undefined && {
        preOrderReleaseAt: body.preOrderReleaseAt ? new Date(body.preOrderReleaseAt as string) : null,
      }),
      // POD fields
      ...(body.podProviderId !== undefined && {
        podProviderId: body.podProviderId ? (body.podProviderId as string) : null,
      }),
      ...(body.baseCost !== undefined && { baseCost: toCentsOrNull(body.baseCost) }),
      ...(body.productionDays !== undefined && {
        productionDays: body.productionDays == null ? null : (body.productionDays as number),
      }),
      ...(body.shippingMY !== undefined && { shippingMY: toCentsOrNull(body.shippingMY) }),
      ...(body.shippingSG !== undefined && { shippingSG: toCentsOrNull(body.shippingSG) }),
      ...(body.shippingPH !== undefined && { shippingPH: toCentsOrNull(body.shippingPH) }),
      ...(body.shippingIntl !== undefined && { shippingIntl: toCentsOrNull(body.shippingIntl) }),
      ...(body.showProviderPublic !== undefined && {
        showProviderPublic: body.showProviderPublic as boolean,
      }),
      ...(body.podExternalUrl !== undefined && {
        podExternalUrl: body.podExternalUrl == null ? null : (body.podExternalUrl as string),
      }),
      // Commission fields
      ...(body.commissionDepositPercent !== undefined && {
        commissionDepositPercent:
          body.commissionDepositPercent == null ? null : (body.commissionDepositPercent as number),
      }),
      ...(body.commissionRevisionsIncluded !== undefined && {
        commissionRevisionsIncluded:
          body.commissionRevisionsIncluded == null ? null : (body.commissionRevisionsIncluded as number),
      }),
      ...(body.commissionTurnaroundDays !== undefined && {
        commissionTurnaroundDays:
          body.commissionTurnaroundDays == null ? null : (body.commissionTurnaroundDays as number),
      }),
    },
  })

  await Promise.all([
    invalidatePattern('marketplace:*'),
    invalidateCache(CACHE_KEYS.trending),
  ])
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { id } = await params

  const product = await verifyProductOwnership(id, userId)
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  })

  await Promise.all([
    invalidatePattern('marketplace:*'),
    invalidateCache(CACHE_KEYS.trending),
  ])
  return NextResponse.json({ success: true })
}
