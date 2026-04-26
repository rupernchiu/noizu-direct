import { notFound } from 'next/navigation'
import Link from 'next/link'
import { loadKbDoc, getAllKbSlugs, getKbManifest } from '@/lib/kb'

export async function generateStaticParams() {
  return getAllKbSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await loadKbDoc(slug)
  return { title: doc?.title ?? 'Knowledgebase' }
}

export default async function KbDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await loadKbDoc(slug)
  if (!doc) notFound()

  const sections = getKbManifest()
  const flatDocs = sections.flatMap((s) => s.docs)
  const idx = flatDocs.findIndex((d) => d.slug === slug)
  const prev = idx > 0 ? flatDocs[idx - 1] : null
  const next = idx < flatDocs.length - 1 ? flatDocs[idx + 1] : null

  return (
    <article className="space-y-6">
      <header className="border-b border-border pb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {doc.section}
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">{doc.title}</h1>
        {doc.description && (
          <p className="text-sm text-muted-foreground mt-2">{doc.description}</p>
        )}
      </header>

      <div
        className="kb-prose"
        dangerouslySetInnerHTML={{ __html: doc.html }}
      />

      <nav className="flex items-center justify-between gap-4 border-t border-border pt-4 text-sm">
        {prev ? (
          <Link href={`/admin/kb/${prev.slug}`} className="text-primary hover:underline">
            ← {prev.title}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/admin/kb/${next.slug}`} className="text-primary hover:underline ml-auto">
            {next.title} →
          </Link>
        ) : <span />}
      </nav>
    </article>
  )
}
