'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const TipTapEditor = dynamic(() => import('@/components/editor/TipTapEditor').then(m => m.TipTapEditor), { ssr: false, loading: () => <div className="h-64 bg-surface rounded-xl animate-pulse" /> })

interface PostEditorProps {
  post?: {
    id: string
    title: string
    slug: string
    excerpt: string | null
    content: string | null
    coverImage: string | null
    status: string
    publishedAt: string | null
    tags: string
    seoTitle: string | null
    seoDescription: string | null
  }
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function PostEditor({ post }: PostEditorProps) {
  const router = useRouter()
  const isNew = !post

  const [title, setTitle]       = useState(post?.title ?? '')
  const [slug, setSlug]         = useState(post?.slug ?? '')
  const [excerpt, setExcerpt]   = useState(post?.excerpt ?? '')
  const [content, setContent]   = useState(post?.content ?? '')
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '')
  const [status, setStatus]     = useState(post?.status ?? 'DRAFT')
  const [publishedAt, setPublishedAt] = useState(post?.publishedAt ? post.publishedAt.slice(0, 16) : '')
  const [tags, setTags]         = useState<string>(() => {
    try { return (JSON.parse(post?.tags ?? '[]') as string[]).join(', ') } catch { return '' }
  })
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? '')
  const [seoDesc, setSeoDesc]   = useState(post?.seoDescription ?? '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const slugWasManuallSet = Boolean(post?.slug)
  const [slugManual, setSlugManual] = useState(slugWasManuallSet)

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slugManual) setSlug(slugify(v))
  }

  const handleContent = useCallback((html: string) => setContent(html), [])

  async function save(targetStatus?: string) {
    setSaving(true)
    setError('')
    const finalStatus = targetStatus ?? status
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    const body = {
      title, slug, excerpt: excerpt || null, content: content || null,
      coverImage: coverImage || null, status: finalStatus,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
      tags: tagArray, seoTitle: seoTitle || null, seoDescription: seoDesc || null,
    }
    try {
      let res: Response
      if (isNew) {
        res = await fetch('/api/admin/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        res = await fetch(`/api/admin/posts/${post.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Save failed')
        return
      }
      router.push('/admin/cms/posts')
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
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Post title"
              className="w-full h-10 rounded-lg border border-border bg-card px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
              placeholder="post-slug"
              className="w-full h-10 rounded-lg border border-border bg-card px-3 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Short summary shown in listings…"
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Content</label>
            <TipTapEditor content={content} onChange={handleContent} placeholder="Write your post…" />
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
                placeholder={title || 'Override page title…'}
                className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Meta Description</label>
              <textarea
                value={seoDesc}
                onChange={e => setSeoDesc(e.target.value)}
                placeholder="Description shown in search results…"
                rows={2}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Publish box */}
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
                <option value="SCHEDULED">Scheduled</option>
              </select>
            </div>
            {(status === 'PUBLISHED' || status === 'SCHEDULED') && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {status === 'SCHEDULED' ? 'Publish at' : 'Published at'}
                </label>
                <input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={e => setPublishedAt(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
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

          {/* Cover image */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cover Image</h3>
            <input
              type="url"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="https://…"
              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt={`${title} cover image`} className="w-full aspect-video object-cover rounded-lg" />
            )}
          </div>

          {/* Tags */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</h3>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>
        </div>
      </div>
    </div>
  )
}
