'use client'

import { useState } from 'react'

interface VideoInsertModalProps {
  onInsert: (url: string) => void
  onClose: () => void
}

function isValidVideoUrl(url: string) {
  return /youtube\.com|youtu\.be|facebook\.com\/.*\/videos/.test(url)
}

export function VideoInsertModal({ onInsert, onClose }: VideoInsertModalProps) {
  const [url, setUrl] = useState('')

  function submit() {
    if (url && isValidVideoUrl(url)) onInsert(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Insert Video</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none cursor-pointer">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">YouTube or Facebook video URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="https://www.youtube.com/watch?v=..."
              autoFocus
              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">Supports YouTube and Facebook video links.</p>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!url || !isValidVideoUrl(url)}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  )
}
