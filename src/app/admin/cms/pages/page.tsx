import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-border text-muted-foreground',
  PUBLISHED: 'bg-green-500/20 text-green-400',
}

const PER_PAGE = 25

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const [total, pages] = await Promise.all([
    prisma.page.count(),
    prisma.page.findMany({
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Static Pages</h2>
        <Link
          href="/admin/cms/pages/new"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Page
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm [&_td]:whitespace-nowrap">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Title</th>
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Slug</th>
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Footer</th>
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Updated</th>
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                <td className="px-3 py-1.5 text-foreground font-medium">{p.title}</td>
                <td className="px-3 py-1.5 text-muted-foreground font-mono text-xs">/{p.slug}</td>
                <td className="px-3 py-1.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status] ?? 'bg-border text-muted-foreground'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-muted-foreground text-xs">
                  {p.showInFooter ? `${p.footerColumn ?? ''}` : '—'}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground text-xs">
                  {new Date(p.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/cms/pages/${p.id}/edit`} className="text-xs text-primary hover:opacity-70">
                      Edit
                    </Link>
                    <Link href={`/${p.slug}`} target="_blank" className="text-xs text-muted-foreground hover:text-foreground">
                      View ↗
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No pages yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination total={total} page={page} perPage={PER_PAGE} />
    </div>
  )
}
