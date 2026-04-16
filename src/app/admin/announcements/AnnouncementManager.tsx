'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PRESET_COLORS = ['#7c3aed', '#00d4aa', '#ef4444', '#f59e0b', '#3b82f6']

interface Announcement {
  id: string
  text: string
  link: string | null
  color: string
  isActive: boolean
  createdAt: string
}

export function AnnouncementManager({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [isActive, setIsActive] = useState(true)
  const [creating, setCreating] = useState(false)

  async function create() {
    if (!text.trim()) return
    setCreating(true)
    try {
      await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, link: link || null, color, isActive }),
      })
      setText('')
      setLink('')
      setColor('#7c3aed')
      setIsActive(true)
      router.refresh()
    } finally {
      setCreating(false)
    }
  }

  async function toggleAnnouncement(id: string, currentIsActive: boolean) {
    await fetch(`/api/admin/announcements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentIsActive }),
    })
    router.refresh()
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Delete this announcement?')) return
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">New Announcement</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Text *</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Announcement text..."
              className="w-full bg-background text-foreground border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Link (optional)</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full bg-background text-foreground border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-2">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-card' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm text-foreground">Active immediately</label>
          </div>
          <button
            onClick={create}
            disabled={creating || !text.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Announcement'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {announcements.map((a) => (
          <div key={a.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm truncate">{a.text}</p>
              {a.link && <p className="text-muted-foreground text-xs truncate">{a.link}</p>}
              <p className="text-muted-foreground text-xs">{new Date(a.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleAnnouncement(a.id, a.isActive)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  a.isActive
                    ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
                    : 'bg-border text-muted-foreground hover:bg-green-500/20 hover:text-green-400'
                }`}
              >
                {a.isActive ? 'Active' : 'Inactive'}
              </button>
              <button
                onClick={() => deleteAnnouncement(a.id)}
                className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground">
            No announcements yet
          </div>
        )}
      </div>
    </div>
  )
}
