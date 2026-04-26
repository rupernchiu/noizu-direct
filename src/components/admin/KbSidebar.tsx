'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { KbSection } from '@/content/kb/manifest'

export function KbSidebar({ sections }: { sections: readonly KbSection[] }) {
  const pathname = usePathname()
  const isIndex = pathname === '/admin/kb'

  return (
    <nav className="space-y-5 text-sm">
      <Link
        href="/admin/kb"
        className={cn(
          'block px-3 py-2 rounded-lg font-semibold transition-colors',
          isIndex ? 'bg-primary text-white' : 'text-foreground hover:bg-card',
        )}
      >
        Knowledgebase
      </Link>
      {sections.map((section) => (
        <div key={section.id}>
          <p className="px-3 text-[11px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
            {section.title}
          </p>
          <ul>
            {section.docs.map((doc) => {
              const href = `/admin/kb/${doc.slug}`
              const active = pathname === href
              return (
                <li key={doc.slug}>
                  <Link
                    href={href}
                    className={cn(
                      'block px-3 py-1.5 rounded text-sm transition-colors',
                      active
                        ? 'bg-primary text-white font-medium'
                        : 'text-muted-foreground hover:bg-card hover:text-foreground',
                    )}
                  >
                    {doc.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
