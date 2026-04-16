import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PageEditor } from '../../PageEditor'

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const { id } = await params
  const page = await prisma.page.findUnique({ where: { id } })
  if (!page) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/cms/pages" className="text-sm text-muted-foreground hover:text-foreground">
          ← Pages
        </Link>
        <h2 className="text-lg font-semibold text-foreground">Edit Page</h2>
      </div>
      <PageEditor page={page} />
    </div>
  )
}
