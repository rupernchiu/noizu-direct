'use client'

import { useState, useRef } from 'react'

interface ImageInsertModalProps {
  onInsert: (opts: { src: string; alt: string; width?: number }) => void
  onClose: () => void
}

export function ImageInsertModal({ onInsert, onClose }: ImageInsertModalProps) {
  const [tab, setTab] = useState<'upload' | 'url' | 'library'>('url')
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [width, setWidth] = useState('')
  const [uploading, setUploading] = useState(false)
  const [library, setLibrary] = useState<{ id: string; url: string; filename: string }[]>([])
  const [libraryLoaded, setLibraryLoaded] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadLibrary() {
    if (libraryLoaded) return
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) {
        const data = await res.json()
        setLibrary(data.items ?? [])
      }
    } catch {}
    setLibraryLoaded(true)
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form })
      if (res.ok) {
        const data = await res.json()
        onInsert({ src: data.url, alt: file.name.replace(/\.[^.]+$/, ''), ...(width ? { width: parseInt(width) } : {}) })
      }
    } finally {
      setUploading(false)
    }
  }

  function submit() {
    if (tab === 'url' && url) {
      onInsert({ src: url, alt, ...(width ? { width: parseInt(width) } : {}) })
    } else if (tab === 'library' && selected) {
      const item = library.find((i) => i.url === selected)
      onInsert({ src: selected, alt: alt || item?.filename || '', ...(width ? { width: parseInt(width) } : {}) })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Insert Image</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none cursor-pointer">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['url', 'upload', 'library'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); if (t === 'library') loadLibrary() }}
              className={`px-4 py-2.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'url' ? 'URL' : t === 'upload' ? 'Upload' : 'Media Library'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Image URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {tab === 'upload' && (
            <div>
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-24 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Click to select image'}
              </button>
            </div>
          )}

          {tab === 'library' && (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {!libraryLoaded ? (
                <div className="col-span-3 text-center text-xs text-muted-foreground py-4">Loading…</div>
              ) : library.length === 0 ? (
                <div className="col-span-3 text-center text-xs text-muted-foreground py-4">No media yet.</div>
              ) : (
                library.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item.url)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                      selected === item.url ? 'border-primary' : 'border-transparent hover:border-border'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* Shared fields */}
          {tab !== 'upload' && (
            <>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Alt text</label>
                <input
                  type="text"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="Describe the image…"
                  className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Width (px, optional)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="e.g. 800"
                  className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {tab !== 'upload' && (
            <button
              type="button"
              onClick={submit}
              disabled={tab === 'url' ? !url : !selected}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              Insert
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
