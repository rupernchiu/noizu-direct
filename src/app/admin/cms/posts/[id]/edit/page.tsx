import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PostEditor } from '../../PostEditor'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const { id } = await params
  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/cms/posts" className="text-sm text-muted-foreground hover:text-foreground">
          ← Articles
        </Link>
        <h2 className="text-lg font-semibold text-foreground">Edit Article</h2>
      </div>
      <PostEditor post={{
        ...post,
        publishedAt: post.publishedAt?.toISOString() ?? null,
      }} />
    </div>
  )
}
