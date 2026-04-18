'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface SectionToggleProps {
  sectionId: string
  isActive: boolean
  content: string
  sectionType?: string
}

export function SectionToggle({ sectionId, isActive, content, sectionType }: SectionToggleProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const [saving, setSaving] = useState(false)

  // Hero settings state
  const [heroSettings, setHeroSettings] = useState<Record<string, unknown>>(() => {
    try { return JSON.parse(content) } catch { return {} }
  })
  const [heroSaving, setHeroSaving] = useState(false)
  const [thumbUploading, setThumbUploading] = useState(false)
  const thumbFileRef = useRef<HTMLInputElement>(null)

  function updateHero(patch: Record<string, unknown>) {
    setHeroSettings(prev => ({ ...prev, ...patch }))
  }

  async function uploadThumbnail(file: File) {
    setThumbUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('key', 'thumbnail')
      const res = await fetch('/api/admin/cms/hero-image', { method: 'POST', body: fd })
      if (!res.ok) { alert('Upload failed'); return }
      const { url } = await res.json() as { url: string }
      updateHero({ videoThumbnail: url })
    } finally {
      setThumbUploading(false)
      if (thumbFileRef.current) thumbFileRef.current.value = ''
    }
  }

  async function saveHeroSettings() {
    setHeroSaving(true)
    try {
      const newContent = JSON.stringify(heroSettings, null, 2)
      setEditContent(newContent)
      await fetch(`/api/admin/cms/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      })
      router.refresh()
    } finally {
      setHeroSaving(false)
    }
  }

  async function toggleActive() {
    setLoading(true)
    try {
      await fetch(`/api/admin/cms/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function saveContent() {
    setSaving(true)
    try {
      JSON.parse(editContent)
      await fetch(`/api/admin/cms/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      setEditing(false)
      router.refresh()
    } catch {
      alert('Invalid JSON content')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-background text-foreground border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary'
  const labelCls = 'block text-xs font-semibold text-foreground mb-1'

  return (
    <div className="flex flex-col gap-2">

      {sectionType === 'HERO' && (
        <div className="mt-1 mb-1 rounded-lg border border-border bg-background p-3 space-y-3">
          <p className="text-xs font-bold text-foreground">Hero Settings</p>

          {/* Video URL */}
          <div>
            <label className={labelCls}>Hero Video URL (MP4)</label>
            <input
              type="url"
              className={inputCls}
              placeholder="https://example.com/video.mp4"
              value={(heroSettings.videoUrl as string) ?? ''}
              onChange={e => updateHero({ videoUrl: e.target.value })}
            />
          </div>

          {/* Thumbnail upload */}
          <div>
            <label className={labelCls}>Video Thumbnail (shown before video loads)</label>
            {!!heroSettings.videoThumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroSettings.videoThumbnail as string} alt="Thumbnail" className="w-full h-16 object-cover rounded border border-border mb-1" />
            )}
            <input ref={thumbFileRef} type="file" accept="image/webp,image/jpeg,image/jpg" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadThumbnail(f) }} />
            <button type="button" disabled={thumbUploading} onClick={() => thumbFileRef.current?.click()}
              className="px-3 py-1 rounded text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50">
              {thumbUploading ? 'Uploading…' : heroSettings.videoThumbnail ? 'Replace Thumbnail' : 'Upload Thumbnail'}
            </button>
          </div>

          {/* Rotating messages */}
          <div>
            <label className={labelCls}>Rotating Messages (one per line)</label>
            <textarea
              rows={5}
              className={inputCls + ' resize-y font-mono'}
              value={((heroSettings.rotatingMessages as string[]) ?? []).join('\n')}
              onChange={e => updateHero({ rotatingMessages: e.target.value.split('\n') })}
            />
          </div>

          {/* Overlay opacity */}
          <div>
            <label className={labelCls}>Overlay Opacity: {(heroSettings.overlayOpacity as number) ?? 50}%</label>
            <input type="range" min={0} max={80} step={5}
              value={(heroSettings.overlayOpacity as number) ?? 50}
              onChange={e => updateHero({ overlayOpacity: Number(e.target.value) })}
              className="w-full accent-primary" />
          </div>

          {/* Show stats */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="showStats"
              checked={(heroSettings.showStats as boolean) !== false}
              onChange={e => updateHero({ showStats: e.target.checked })}
              className="accent-primary" />
            <label htmlFor="showStats" className="text-xs text-foreground">Show Stats Row</label>
          </div>

          <button type="button" disabled={heroSaving} onClick={saveHeroSettings}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50">
            {heroSaving ? 'Saving…' : 'Save Hero Settings'}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={toggleActive} disabled={loading}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
            isActive ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
                     : 'bg-border text-muted-foreground hover:bg-green-500/20 hover:text-green-400'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </button>
        <button onClick={() => setEditing(!editing)}
          className="px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
          Edit Raw JSON
        </button>
      </div>

      {editing && (
        <div className="mt-2 space-y-2">
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={8}
            className="w-full bg-background text-foreground border border-border rounded-lg px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:border-primary" />
          <div className="flex gap-2">
            <button onClick={saveContent} disabled={saving}
              className="px-3 py-1 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setEditContent(content) }}
              className="px-3 py-1 rounded text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
