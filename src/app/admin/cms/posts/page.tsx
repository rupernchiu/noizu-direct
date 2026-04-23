import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Suspense } from 'react'
import { SearchBar } from '@/components/ui/SearchBar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Pagination } from '@/components/ui/Pagination'

const PER_PAGE = 20

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SCHEDULED', label: 'Scheduled' },
]

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-border text-muted-foreground',
  PUBLISHED: 'bg-green-500/20 text-green-400',
  SCHEDULED: 'bg-yellow-500/20 text-yellow-400',
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const q      = params.q?.trim() ?? ''
  const page   = Math.max(1, parseInt(params.page ?? '1') || 1)
  const status = params.status ?? ''

  const where: any = {}
  if (q) where.OR = [{ title: { contains: q } }, { excerpt: { contains: q } }]
  if (status) where.status = status

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      select: { id: true, slug: true, title: true, status: true, publishedAt: true, viewCount: true, createdAt: true, author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Articles</h2>
        <Link
          href="/admin/cms/posts/new"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Article
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search posts…" className="min-w-52 flex-1" />
          <FilterSelect paramName="status" options={STATUS_OPTIONS} allLabel="All Statuses" className="w-36" />
        </Suspense>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Title</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Author</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">Views</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Published</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-3 py-1.5">
                    <p className="text-foreground font-medium truncate max-w-xs">{post.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">/blog/{post.slug}</p>
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">{post.author.name}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[post.status] ?? 'bg-border text-muted-foreground'}`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground text-xs">{post.viewCount}</td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/cms/posts/${post.id}/edit`} className="text-xs text-primary hover:opacity-70">
                        Edit
                      </Link>
                      <Link href={`/blog/${post.slug}`} target="_blank" className="text-xs text-muted-foreground hover:text-foreground">
                        View ↗
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No posts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
