import Link from 'next/link'
import { getKbManifest } from '@/lib/kb'

export default function KbIndexPage() {
  const sections = getKbManifest()
  const totalDocs = sections.reduce((acc, s) => acc + s.docs.length, 0)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Business knowledgebase</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          The full picture of what noizu.direct does, how it operates, and what runs underneath. Written for humans
          and AI alike — feed any of these docs to a model when you need it to reason about the business or codebase
          with full context. {totalDocs} documents across {sections.length} sections.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <section key={section.id} className="bg-card rounded-xl p-5 border border-border">
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{section.intro}</p>
            <ul className="mt-3 space-y-1.5">
              {section.docs.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    href={`/admin/kb/${doc.slug}`}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {doc.title}
                  </Link>
                  <span className="text-xs text-muted-foreground"> — {doc.blurb}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
