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

  // Hero image upload state
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroImageUrl, setHeroImageUrl] = useState<string>(() => {
    try { return JSON.parse(content).bgImage ?? '' } catch { return '' }
  })
  const heroFileRef = useRef<HTMLInputElement>(null)

  async function uploadHeroImage(file: File) {
    setHeroUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/cms/hero-image', { method: 'POST', body: fd })
      if (!res.ok) { alert('Upload failed'); return }
      const { url } = await res.json() as { url: string }
      // Merge bgImage into current content and save
      let parsed: Record<string, unknown> = {}
      try { parsed = JSON.parse(editContent) } catch { parsed = {} }
      parsed.bgImage = url
      const newContent = JSON.stringify(parsed, null, 2)
      setEditContent(newContent)
      setHeroImageUrl(url)
      await fetch(`/api/admin/cms/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      })
      router.refresh()
    } finally {
      setHeroUploading(false)
      if (heroFileRef.current) heroFileRef.current.value = ''
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
      // Validate JSON
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

  return (
    <div className="flex flex-col gap-2">
      {sectionType === 'HERO' && (
        <div className="mt-1 mb-1 rounded-lg border border-border bg-background p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Hero Background Image</p>
          <p className="text-xs text-muted-foreground">Recommended: 1920 × 600px, max 2MB, WebP or JPG</p>
          {heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImageUrl} alt="Hero background" className="w-full h-20 object-cover rounded border border-border" />
          )}
          <input
            ref={heroFileRef}
            type="file"
            accept="image/webp,image/jpeg,image/jpg"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadHeroImage(f) }}
          />
          <button
            type="button"
            disabled={heroUploading}
            onClick={() => heroFileRef.current?.click()}
            className="px-3 py-1 rounded text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            {heroUploading ? 'Uploading…' : heroImageUrl ? 'Replace Image' : 'Upload Image'}
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleActive}
          disabled={loading}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
            isActive
              ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
              : 'bg-border text-muted-foreground hover:bg-green-500/20 hover:text-green-400'
          }`}
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>
        <button
          onClick={() => setEditing(!editing)}
          className="px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          Edit Content
        </button>
      </div>
      {editing && (
        <div className="mt-2 space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={8}
            className="w-full bg-background text-foreground border border-border rounded-lg px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={saveContent}
              disabled={saving}
              className="px-3 py-1 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setEditContent(content) }}
              className="px-3 py-1 rounded text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
