'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SectionToggleProps {
  sectionId: string
  isActive: boolean
  content: string
}

export function SectionToggle({ sectionId, isActive, content }: SectionToggleProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const [saving, setSaving] = useState(false)

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
      <div className="flex items-center gap-2">
        <button
          onClick={toggleActive}
          disabled={loading}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
            isActive
              ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
              : 'bg-[#2a2a3a] text-[#8888aa] hover:bg-green-500/20 hover:text-green-400'
          }`}
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>
        <button
          onClick={() => setEditing(!editing)}
          className="px-2 py-0.5 rounded text-xs font-medium bg-[#7c3aed]/20 text-[#7c3aed] hover:bg-[#7c3aed]/30 transition-colors"
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
            className="w-full bg-[#0d0d12] text-[#f0f0f5] border border-[#2a2a3a] rounded-lg px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:border-[#7c3aed]"
          />
          <div className="flex gap-2">
            <button
              onClick={saveContent}
              disabled={saving}
              className="px-3 py-1 rounded text-xs font-medium bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setEditContent(content) }}
              className="px-3 py-1 rounded text-xs font-medium bg-[#2a2a3a] text-[#8888aa] hover:text-[#f0f0f5] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
