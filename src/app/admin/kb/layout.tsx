import { getKbManifest } from '@/lib/kb'
import { KbSidebar } from '@/components/admin/KbSidebar'

export const metadata = {
  title: 'Knowledgebase',
}

export default function KbLayout({ children }: { children: React.ReactNode }) {
  const sections = getKbManifest()
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="lg:w-64 shrink-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:sticky lg:top-6">
        <KbSidebar sections={sections} />
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
