import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const userId = (session?.user as any)?.id as string
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creator = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!creator) return NextResponse.json({ error: 'Not a creator' }, { status: 403 })

  const codes = await prisma.discountCode.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { id: true, title: true } } },
  })

  return NextResponse.json({ codes })
}

export async function POST(req: Request) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creator = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!creator) return NextResponse.json({ error: 'Not a creator' }, { status: 403 })

  const body = await req.json() as {
    code: string
    type: string
    value: number
    minimumOrderAmount?: number
    maxUses?: number
    expiresAt?: string
    productId?: string
  }

  const { code, type, value, minimumOrderAmount, maxUses, expiresAt, productId } = body

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }
  if (type !== 'PERCENTAGE' && type !== 'FIXED_AMOUNT') {
    return NextResponse.json({ error: 'Type must be PERCENTAGE or FIXED_AMOUNT' }, { status: 400 })
  }
  if (typeof value !== 'number' || value <= 0) {
    return NextResponse.json({ error: 'Value must be a positive number' }, { status: 400 })
  }
  if (type === 'PERCENTAGE' && value > 100) {
    return NextResponse.json({ error: 'Percentage cannot exceed 100' }, { status: 400 })
  }

  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, creatorId: creator.id },
      select: { id: true },
    })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  try {
    const discountCode = await prisma.discountCode.create({
      data: {
        code: code.trim().toUpperCase(),
        type,
        value,
        minimumOrderAmount: minimumOrderAmount ?? null,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        creatorId: creator.id,
        productId: productId ?? null,
      },
    })
    return NextResponse.json({ discountCode }, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A discount code with that name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create discount code' }, { status: 500 })
  }
}
