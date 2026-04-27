import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCreator, verifyProductOwnership } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { invalidateCache, invalidatePattern, CACHE_KEYS } from '@/lib/redis'
import { isCreatorOwnedDigitalKey } from '@/lib/upload-validators'
import { serializeShippingMap, type ShippingRateMap, ROW_KEY, SHIPPING_COUNTRIES, hasAnyShippingRate, isPhysicalType } from '@/lib/shipping'

// Same strict shape as POST /api/products — see that file for context.
const digitalFileSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1).max(512),
  size: z.number().int().nonnegative(),
  mime: z.string().min(1).max(255),
}).strict()

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

  // Product `type` is immutable post-create. Allowing a flip (e.g. PHYSICAL → DIGITAL)
  // bypasses the create-time invariant checks (digital files required, shipping config,
  // milestones, POD provider) and produces orders that cannot be fulfilled.
  if (body.type !== undefined && body.type !== product.type) {
    return NextResponse.json(
      { error: 'Product type cannot be changed after creation. Archive this listing and create a new one.' },
      { status: 400 },
    )
  }

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

  // Block publish for PHYSICAL/POD listings unless this product has at least
  // one shipping rate set. Edits to unpublished drafts are allowed without it.
  if (body.isActive === true && isPhysicalType(product.type)) {
    const incoming = body.shippingByCountry !== undefined
      ? (typeof body.shippingByCountry === 'string'
          ? body.shippingByCountry
          : body.shippingByCountry == null
            ? null
            : JSON.stringify(body.shippingByCountry))
      : product.shippingByCountry
    if (!hasAnyShippingRate(incoming as string | null | undefined)) {
      return NextResponse.json(
        {
          error:
            'Set at least one country shipping rate on this listing before publishing.',
        },
        { status: 400 },
      )
    }
  }

  // ── C1 (Critical) ─────────────────────────────────────────────────────────
  // Re-verify digitalFiles[].key ownership on update. Without this, a creator
  // can skip the POST check by editing an existing DIGITAL product afterwards.
  if (body.digitalFiles !== undefined) {
    const parsed = z.array(digitalFileSchema).safeParse(body.digitalFiles)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid digital files payload' }, { status: 400 })
    }
    for (const f of parsed.data) {
      if (!isCreatorOwnedDigitalKey(f.key, product.creatorId)) {
        return NextResponse.json(
          { error: 'digitalFiles[].key must live under your own digital/<profile>/ prefix' },
          { status: 400 },
        )
      }
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title as string }),
      ...(body.description !== undefined && { description: body.description as string }),
      ...(body.price !== undefined && { price: Math.round((body.price as number) * 100) }),
      ...(body.category !== undefined && { category: body.category as string }),
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
      // Per-product shipping rates (Shipping V2).
      ...(body.shippingByCountry !== undefined && {
        shippingByCountry: (() => {
          const v = body.shippingByCountry
          if (v == null || v === '') return null
          if (typeof v !== 'object' || Array.isArray(v)) return null
          const validKeys = new Set<string>([ROW_KEY, ...SHIPPING_COUNTRIES.map(c => c.code)])
          const cleaned: ShippingRateMap = {}
          for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
            const key = k.toUpperCase()
            if (!validKeys.has(key)) continue
            if (val == null || val === '') continue
            const num = Number(val)
            if (!Number.isFinite(num) || num < 0 || num > 50_000) continue
            cleaned[key as keyof ShippingRateMap] = Math.round(num)
          }
          return serializeShippingMap(cleaned)
        })(),
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
