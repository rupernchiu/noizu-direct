import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SectionToggle } from './SectionToggle'

export default async function AdminCmsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const sections = await prisma.section.findMany({
    where: { pageSlug: 'home' },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#f0f0f5]">CMS — Home Page Sections</h2>

      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[#8888aa] text-xs font-mono">#{section.order}</span>
                <div>
                  <p className="text-[#f0f0f5] font-medium text-sm">{section.type}</p>
                  <p className="text-[#8888aa] text-xs">Updated {new Date(section.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <SectionToggle
                sectionId={section.id}
                isActive={section.isActive}
                content={section.content}
              />
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <div className="bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] p-6 text-center text-[#8888aa]">
            No sections found for the home page
          </div>
        )}
      </div>
    </div>
  )
}
