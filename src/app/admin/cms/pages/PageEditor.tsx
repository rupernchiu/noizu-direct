'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const TipTapEditor = dynamic(() => import('@/components/editor/TipTapEditor').then(m => m.TipTapEditor), { ssr: false, loading: () => <div className="h-64 bg-surface rounded-xl animate-pulse" /> })

interface PageEditorProps {
  page?: {
    id: string
    title: string
    slug: string
    content: string | null
    status: string
    showInFooter: boolean
    footerColumn: string | null
    footerOrder: number | null
    seoTitle: string | null
    seoDescription: string | null
  }
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function PageEditor({ page }: PageEditorProps) {
  const router = useRouter()
  const isNew = !page

  const [title, setTitle]               = useState(page?.title ?? '')
  const [slug, setSlug]                 = useState(page?.slug ?? '')
  const [content, setContent]           = useState(page?.content ?? '')
  const [status, setStatus]             = useState(page?.status ?? 'DRAFT')
  const [showInFooter, setShowInFooter] = useState(page?.showInFooter ?? false)
  const [footerColumn, setFooterColumn] = useState(page?.footerColumn ?? '')
  const [footerOrder, setFooterOrder]   = useState(String(page?.footerOrder ?? ''))
  const [seoTitle, setSeoTitle]         = useState(page?.seoTitle ?? '')
  const [seoDesc, setSeoDesc]           = useState(page?.seoDescription ?? '')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [slugManual, setSlugManual]     = useState(!isNew)

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slugManual) setSlug(slugify(v))
  }

  const handleContent = useCallback((html: string) => setContent(html), [])

  async function save(targetStatus?: string) {
    setSaving(true)
    setError('')
    const finalStatus = targetStatus ?? status
    const body = {
      title, slug, content: content || null, status: finalStatus,
      showInFooter, footerColumn: footerColumn || null,
      footerOrder: footerOrder ? parseInt(footerOrder) : null,
      seoTitle: seoTitle || null, seoDescription: seoDesc || null,
    }
    try {
      let res: Response
      if (isNew) {
        res = await fetch('/api/admin/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        res = await fetch(`/api/admin/pages/${page.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Save failed')
        return
      }
      router.push('/admin/cms/pages')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {error && (
        <div id="page-error" role="alert" className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'page-error' : undefined}
              placeholder="Page title"
              className="w-full h-10 rounded-lg border border-border bg-card px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'page-error' : undefined}
              placeholder="page-slug"
              className="w-full h-10 rounded-lg border border-border bg-card px-3 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">URL will be /{slug}</p>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Content</label>
            <TipTapEditor content={content} onChange={handleContent} placeholder="Write page content…" />
          </div>

          {/* SEO */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SEO</h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">SEO Title</label>
              <input
                type="text"
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? 'page-error' : undefined}
                placeholder={title || 'Override page title…'}
                className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Meta Description</label>
              <textarea
                value={seoDesc}
                onChange={e => setSeoDesc(e.target.value)}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? 'page-error' : undefined}
                placeholder="Description shown in search results…"
                rows={2}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Publish */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Publish</h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => save('PUBLISHED')}
                disabled={saving || !title || !slug}
                className="w-full h-9 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
              >
                {saving ? 'Saving…' : 'Publish'}
              </button>
              <button
                type="button"
                onClick={() => save('DRAFT')}
                disabled={saving || !title || !slug}
                className="w-full h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer"
              >
                Save Draft
              </button>
            </div>
          </div>

          {/* Footer settings */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Footer</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInFooter}
                onChange={e => setShowInFooter(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Show in footer</span>
            </label>
            {showInFooter && (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Column</label>
                  <select
                    value={footerColumn}
                    onChange={e => setFooterColumn(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    <option value="">— choose —</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="Creators">Creators</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Order</label>
                  <input
                    type="number"
                    value={footerOrder}
                    onChange={e => setFooterOrder(e.target.value)}
                    aria-invalid={!!error || undefined}
                    aria-describedby={error ? 'page-error' : undefined}
                    placeholder="1"
                    min="1"
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
