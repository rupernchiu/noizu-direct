'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputCls =
  'w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const btnPrimary =
  'px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

const PORTFOLIO_CATEGORIES = [
  { value: 'Digital Art', label: 'Digital Art' },
  { value: 'Cosplay', label: 'Cosplay' },
  { value: 'Doujin', label: 'Doujin' },
  { value: 'Prop Making', label: 'Prop Making' },
  { value: 'Photography', label: 'Photography' },
  { value: 'Other', label: 'Other' },
]

interface PortfolioItem {
  id: string
  title: string
  description: string
  category: string
  imageUrl: string
  isPublic: boolean
}

function parsePortfolio(raw: string | null): PortfolioItem[] {
  try { return JSON.parse(raw ?? '[]') as PortfolioItem[] } catch { return [] }
}

async function uploadFile(file: File, subdir: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('subdir', subdir)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json() as { url: string }
  return data.url
}

function ErrorAlert({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
      {msg}
    </div>
  )
}

function SuccessAlert({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-secondary/10 border border-secondary/30 px-4 py-3 text-sm text-secondary">
      {msg}
    </div>
  )
}

interface Props {
  profile: { portfolioItems: string | null }
}

export function PortfolioSection({ profile }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<PortfolioItem[]>(parsePortfolio(profile.portfolioItems))
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState(PORTFOLIO_CATEGORIES[0].value)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handlePortfolioImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setNewImageUrl(await uploadFile(file, 'portfolio')) }
    catch { setError('Failed to upload image') }
    finally { setUploading(false) }
  }

  function addItem() {
    if (!newTitle.trim()) return
    const item: PortfolioItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      imageUrl: newImageUrl,
      isPublic: true,
    }
    setItems((prev) => [...prev, item])
    setNewTitle('')
    setNewDescription('')
    setNewCategory(PORTFOLIO_CATEGORIES[0].value)
    setNewImageUrl('')
    setShowAddForm(false)
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function togglePublic(id: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, isPublic: !i.isPublic } : i))
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    setItems((prev) => {
      const next = [...prev]
      const swap = direction === 'up' ? index - 1 : index + 1
      if (swap < 0 || swap >= next.length) return prev
      ;[next[index], next[swap]] = [next[swap], next[index]]
      return next
    })
  }

  async function handleSave() {
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioItems: items }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Failed to save')
        return
      }
      setSuccess(true)
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Portfolio</h2>
        <p className="text-sm text-muted-foreground mt-1">Showcase your work to potential clients.</p>
      </div>

      {error && <ErrorAlert msg={error} />}
      {success && <SuccessAlert msg="Portfolio saved successfully." />}

      {/* Item list */}
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="rounded-lg bg-surface border border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No portfolio items yet. Add your first item below.
          </div>
        )}
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex gap-3 rounded-xl bg-surface border border-border p-3"
          >
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-card border border-border shrink-0 flex items-center justify-center">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-muted-foreground text-xs">No img</span>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium shrink-0">
                  {item.category}
                </span>
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-1 shrink-0">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(idx, 'up')}
                  disabled={idx === 0}
                  className="w-6 h-6 rounded bg-card border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs flex items-center justify-center transition-colors"
                  title="Move up"
                >▲</button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 'down')}
                  disabled={idx === items.length - 1}
                  className="w-6 h-6 rounded bg-card border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs flex items-center justify-center transition-colors"
                  title="Move down"
                >▼</button>
              </div>
              <button
                type="button"
                onClick={() => togglePublic(item.id)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  item.isPublic
                    ? 'bg-secondary/15 border border-secondary/30 text-secondary hover:bg-secondary/25'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.isPublic ? 'Public' : 'Draft'}
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="px-2 py-1 rounded text-[10px] font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item inline form */}
      {showAddForm ? (
        <div className="rounded-xl bg-surface border border-primary/40 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">New Portfolio Item</h3>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Character Commission — Sakura"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              maxLength={400}
              placeholder="Brief description of this piece..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className={inputCls}
            >
              {PORTFOLIO_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Image</label>
            {newImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={newImageUrl} alt="Preview" className="w-24 h-24 rounded-lg object-cover mb-2 border border-border" />
            )}
            <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
              {uploading ? 'Uploading...' : 'Choose Image'}
              <input
                type="file"
                accept="image/*"
                onChange={handlePortfolioImageChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={addItem}
              disabled={!newTitle.trim() || uploading}
              className={btnPrimary}
            >
              Add to Portfolio
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewTitle(''); setNewDescription(''); setNewImageUrl('') }}
              className="px-4 py-2.5 rounded-lg bg-card border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 py-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          + Add Item
        </button>
      )}

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={btnPrimary}
        >
          {saving ? 'Saving...' : 'Save Portfolio'}
        </button>
      </div>
    </div>
  )
}
