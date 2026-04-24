import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { creatorId } = await params

  try {
    const item = await prisma.creatorFollow.findUnique({
      where: { buyerId_creatorId: { buyerId: userId, creatorId } },
    })
    return NextResponse.json({ following: !!item })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { creatorId } = await params

  try {
    await prisma.creatorFollow.deleteMany({
      where: { buyerId: userId, creatorId },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { creatorId } = await params

  try {
    const body = await req.json() as {
      notifyNewProduct?: boolean
      notifyCommissionOpen?: boolean
      notifyNewPost?: boolean
      notifyBroadcast?: boolean
    }

    const item = await prisma.creatorFollow.update({
      where: { buyerId_creatorId: { buyerId: userId, creatorId } },
      data: {
        ...(body.notifyNewProduct !== undefined && { notifyNewProduct: body.notifyNewProduct }),
        ...(body.notifyCommissionOpen !== undefined && { notifyCommissionOpen: body.notifyCommissionOpen }),
        ...(body.notifyNewPost !== undefined && { notifyNewPost: body.notifyNewPost }),
        ...(body.notifyBroadcast !== undefined && { notifyBroadcast: body.notifyBroadcast }),
      },
    })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
