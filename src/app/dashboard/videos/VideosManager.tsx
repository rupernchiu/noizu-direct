'use client'

import { useState } from 'react'
import { Play, Share2, Plus, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react'

interface Video {
  id: string
  title: string
  platform: string
  url: string
  embedId: string
  description: string | null
  order: number
  isActive: boolean
}

const inputCls = 'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors'
const selectCls = inputCls

function extractEmbedId(platform: string, url: string): string {
  if (platform === 'YOUTUBE') {
    const patterns = [
      /youtu\.be\/([^?&#]+)/,
      /youtube\.com\/watch\?v=([^&#]+)/,
      /youtube\.com\/embed\/([^?&#]+)/,
      /youtube\.com\/shorts\/([^?&#]+)/,
    ]
    for (const p of patterns) {
      const m = url.match(p)
      if (m) return m[1]
    }
  }
  return ''
}

export function VideosManager({ initialVideos }: { initialVideos: Video[] }) {
  const [videos, setVideos]       = useState<Video[]>(initialVideos)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '', platform: 'YOUTUBE', url: '', description: '',
  })

  const embedPreview = form.platform === 'YOUTUBE' ? extractEmbedId('YOUTUBE', form.url) : ''

  async function save() {
    if (!form.title.trim() || !form.url.trim()) {
      setError('Title and URL are required')
      return
    }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, order: videos.length }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      const created: Video = await res.json()
      setVideos(v => [...v, created])
      setForm({ title: '', platform: 'YOUTUBE', url: '', description: '' })
      setShowForm(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(video: Video) {
    const res = await fetch(`/api/videos/${video.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !video.isActive }),
    })
    if (res.ok) {
      const updated: Video = await res.json()
      setVideos(v => v.map(x => x.id === updated.id ? updated : x))
    }
  }

  async function deleteVideo(id: string) {
    if (!confirm('Delete this video?')) return
    const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' })
    if (res.ok) setVideos(v => v.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Videos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Embed YouTube and Facebook videos on your creator page</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> Add Video
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Add New Video</h2>

          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Video title" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Platform *</label>
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value, url: '' }))} className={selectCls}>
                <option value="YOUTUBE">YouTube</option>
                <option value="FACEBOOK">Facebook</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Video URL *</label>
            <input
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              className={inputCls}
              placeholder={form.platform === 'YOUTUBE' ? 'https://www.youtube.com/watch?v=...' : 'https://www.facebook.com/watch?v=...'}
            />
            {form.platform === 'YOUTUBE' && form.url && (
              <p className="mt-1 text-xs text-muted-foreground">
                {embedPreview ? `✓ Video ID: ${embedPreview}` : '⚠ Could not extract video ID — check URL format'}
              </p>
            )}
          </div>

          {/* YouTube preview */}
          {form.platform === 'YOUTUBE' && embedPreview && (
            <div className="overflow-hidden rounded-xl aspect-video max-w-xs">
              <iframe
                src={`https://www.youtube.com/embed/${embedPreview}`}
                className="h-full w-full"
                allowFullScreen
                title="Preview"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-none`} placeholder="Short description" />
          </div>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save Video'}
            </button>
            <button onClick={() => { setShowForm(false); setError('') }} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Video list */}
      {videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">No videos yet — add your first one above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <div
              key={video.id}
              className={[
                'flex items-center gap-4 rounded-2xl border bg-card p-4 transition-opacity',
                !video.isActive ? 'opacity-50' : '',
              ].join(' ')}
            >
              <GripVertical className="size-4 text-muted-foreground/40 shrink-0" />

              {/* Thumbnail */}
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-surface relative">
                {video.platform === 'YOUTUBE' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://img.youtube.com/vi/${video.embedId}/mqdefault.jpg`} alt={`${video.title} video thumbnail`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Share2 className="size-6 text-[#1877f2]" />
                  </div>
                )}
                <span className={[
                  'absolute bottom-1 right-1 rounded px-1 py-0.5 text-[9px] font-bold uppercase text-white',
                  video.platform === 'YOUTUBE' ? 'bg-[#ff0000]' : 'bg-[#1877f2]',
                ].join(' ')}>
                  {video.platform === 'YOUTUBE' ? 'YT' : 'FB'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{video.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{video.url}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(video)}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                  title={video.isActive ? 'Hide' : 'Show'}
                >
                  {video.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <button
                  onClick={() => deleteVideo(video.id)}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
