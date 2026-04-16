import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const isAdmin = session && (session.user as any).role === 'ADMIN'
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { action } = body as { action: 'pin' | 'unpin' | 'suppress' | 'unsuppress' }

  let data: Record<string, unknown>
  switch (action) {
    case 'pin':
      data = { manualBoost: 999 }
      break
    case 'unpin':
      data = { manualBoost: 0 }
      break
    case 'suppress':
      data = { isTrendingSuppressed: true }
      break
    case 'unsuppress':
      data = { isTrendingSuppressed: false }
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const product = await prisma.product.update({ where: { id }, data })
  return NextResponse.json(product)
}
