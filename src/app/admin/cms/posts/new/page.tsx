import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PostEditor } from '../PostEditor'

export default async function NewPostPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/cms/posts" className="text-sm text-muted-foreground hover:text-foreground">
          ← Articles
        </Link>
        <h2 className="text-lg font-semibold text-foreground">New Article</h2>
      </div>
      <PostEditor />
    </div>
  )
}
