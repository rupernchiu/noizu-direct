import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EditListingForm } from './EditListingForm'

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const { id } = await params

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) redirect('/')

  const product = await prisma.product.findUnique({
    where: { id },
    include: { creator: true },
  })

  if (!product || product.creator.userId !== userId) redirect('/dashboard/listings')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit Listing</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your product details</p>
      </div>
      <EditListingForm product={product} />
    </div>
  )
}
