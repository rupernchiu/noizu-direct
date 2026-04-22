import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SectionToggle } from './SectionToggle'
import Link from 'next/link'

export default async function AdminCmsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const [sections, postCount, pageCount, navCount] = await Promise.all([
    prisma.section.findMany({ where: { pageSlug: 'home' }, orderBy: { order: 'asc' } }),
    prisma.post.count(),
    prisma.page.count(),
    prisma.navItem.count(),
  ])

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Content Management</h2>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/admin/cms/posts"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors group"
        >
          <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{postCount}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Articles</p>
          <p className="text-xs text-primary mt-2 group-hover:underline">Manage articles →</p>
        </Link>
        <Link
          href="/admin/cms/pages"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors group"
        >
          <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{pageCount}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Static Pages</p>
          <p className="text-xs text-primary mt-2 group-hover:underline">Manage pages →</p>
        </Link>
        <Link
          href="/admin/cms/navigation"
          className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors group col-span-2"
        >
          <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{navCount}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Navigation Items</p>
          <p className="text-xs text-primary mt-2 group-hover:underline">Manage navigation →</p>
        </Link>
      </div>

      <h3 className="text-sm font-semibold text-foreground">Home Page Sections</h3>

      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs font-mono">#{section.order}</span>
                <div>
                  <p className="text-foreground font-medium text-sm">{section.type}</p>
                  <p className="text-muted-foreground text-xs">Updated {new Date(section.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <SectionToggle
                sectionId={section.id}
                isActive={section.isActive}
                content={section.content}
                sectionType={section.type}
              />
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground">
            No sections found for the home page
          </div>
        )}
      </div>
    </div>
  )
}
