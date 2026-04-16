import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageEditor } from '../PageEditor'

export default async function NewPagePage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/cms/pages" className="text-sm text-muted-foreground hover:text-foreground">
          ← Pages
        </Link>
        <h2 className="text-lg font-semibold text-foreground">New Page</h2>
      </div>
      <PageEditor />
    </div>
  )
}
