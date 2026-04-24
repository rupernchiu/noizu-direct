'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Constants ───────────────────────────────────────────────────────────────

const COMMISSION_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'LIMITED', label: 'Limited' },
]

const CATEGORY_OPTIONS = [
  { value: 'DIGITAL_ART', label: 'Digital Art' },
  { value: 'DOUJIN', label: 'Doujin' },
  { value: 'COSPLAY_PRINT', label: 'Cosplay Print' },
  { value: 'PHYSICAL_MERCH', label: 'Physical Merch' },
  { value: 'STICKERS', label: 'Stickers' },
]

const PORTFOLIO_CATEGORIES = [
  { value: 'Digital Art', label: 'Digital Art' },
  { value: 'Cosplay', label: 'Cosplay' },
  { value: 'Doujin', label: 'Doujin' },
  { value: 'Prop Making', label: 'Prop Making' },
  { value: 'Photography', label: 'Photography' },
  { value: 'Other', label: 'Other' },
]

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/handle' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@handle' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/handle' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/handle' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@handle' },
  { key: 'website', label: 'Website', placeholder: 'https://yoursite.com' },
] as const

type Tab = 'appearance' | 'portfolio' | 'store' | 'settings'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioItem {
  id: string
  title: string
  description: string
  category: string
  imageUrl: string
  isPublic: boolean
}

interface PricingTier {
  tier: string
  price: number
  description: string
}

interface CreatorProfile {
  username: string
  displayName: string | null
  bio: string | null
  avatar: string | null
  bannerImage: string | null
  logoImage: string | null
  commissionStatus: string
  announcementText: string | null
  announcementActive: boolean
  absorbProcessingFee: boolean
  categoryTags: string | null
  socialLinks: string | null
  isVerified: boolean
  isTopCreator: boolean
  portfolioItems: string | null
  commissionSlots: number | null
  commissionTerms: string | null
  commissionPricing: string | null
  commissionDescription: string | null
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseTags(raw: string | null): string[] {
  try { return JSON.parse(raw ?? '[]') as string[] } catch { return [] }
}

function parseLinks(raw: string | null): Record<string, string> {
  try { return JSON.parse(raw ?? '{}') as Record<string, string> } catch { return {} }
}

function parsePortfolio(raw: string | null): PortfolioItem[] {
  try { return JSON.parse(raw ?? '[]') as PortfolioItem[] } catch { return [] }
}

function parsePricing(raw: string | null): PricingTier[] {
  try { return JSON.parse(raw ?? '[]') as PricingTier[] } catch { return [] }
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg bg-card border border-border px-3 py-2 text-base sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const btnPrimary =
  'w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

// ─── Alert helpers ────────────────────────────────────────────────────────────

function ErrorAlert({ msg, id }: { msg: string; id?: string }) {
  return (
    <div id={id} role="alert" className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
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

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadFile(file: File, subdir: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('subdir', subdir)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json() as { url: string }
  return data.url
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — APPEARANCE
// ═══════════════════════════════════════════════════════════════════════════════

function AppearanceTab({ profile }: { profile: CreatorProfile }) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.displayName ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [commissionStatus, setCommissionStatus] = useState(profile.commissionStatus)
  const [announcementText, setAnnouncementText] = useState(profile.announcementText ?? '')
  const [announcementActive, setAnnouncementActive] = useState(profile.announcementActive)
  const [categoryTags, setCategoryTags] = useState<string[]>(parseTags(profile.categoryTags))
  const [socialLinks, setSocialLinks] = useState(parseLinks(profile.socialLinks))
  const [avatar, setAvatar] = useState(profile.avatar ?? '')
  const [bannerImage, setBannerImage] = useState(profile.bannerImage ?? '')
  const [logoImage, setLogoImage] = useState(profile.logoImage ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setAvatar(await uploadFile(file, 'avatars')) }
    catch { setError('Failed to upload avatar') }
    finally { setUploading(false) }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setBannerImage(await uploadFile(file, 'banners')) }
    catch { setError('Failed to upload banner') }
    finally { setUploading(false) }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setLogoImage(await uploadFile(file, 'logos')) }
    catch { setError('Failed to upload logo') }
    finally { setUploading(false) }
  }

  function toggleCategory(value: string) {
    setCategoryTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          bio,
          commissionStatus,
          announcementText,
          announcementActive,
          avatar: avatar || undefined,
          bannerImage: bannerImage || undefined,
          logoImage: logoImage || undefined,
          categoryTags,
          socialLinks,
        }),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorAlert msg={error} id="appearance-error" />}
      {success && <SuccessAlert msg="Profile saved successfully." />}

      {/* Banner & Avatar */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Banner Image</label>
          <p className="text-xs text-muted-foreground mb-2">Recommended: 1500×500 px (3:1), JPG or PNG, under 5&nbsp;MB.</p>
          <div className="relative h-28 w-full rounded-xl overflow-hidden bg-gradient-to-r from-primary/30 to-secondary/30 border border-border">
            {bannerImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
            )}
            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-black/30 hover:bg-black/40 transition-colors text-white text-xs font-medium text-center px-3">
              <span>{uploading ? 'Uploading...' : 'Change Banner'}</span>
              {!uploading && (
                <span className="mt-0.5 text-[10px] font-normal text-white/80">1500×500 px · JPG/PNG · up to 5 MB</span>
              )}
              <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-primary/30 border-2 border-border shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                {displayName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-black/60 opacity-0 hover:opacity-100 transition-opacity text-white text-[10px] font-medium text-center px-1 leading-tight">
              <span>Change</span>
              <span className="text-[8px] font-normal text-white/80 mt-0.5">400×400 · 2 MB</span>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <div className="text-xs text-muted-foreground">Click the avatar to upload. Recommended: square image, 400×400 px, JPG or PNG, under 2&nbsp;MB.</div>
        </div>

        {/* Creator Logo */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Creator Logo</label>
          <p className="text-xs text-muted-foreground mb-2">Shown on your About tab. Recommended: square image, 400×400 px (min 200×200), JPG or PNG, under 2&nbsp;MB.</p>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-card border-2 border-border shrink-0">
              {logoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center px-1">
                  No logo
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/40 opacity-0 hover:opacity-100 transition-opacity text-white text-[10px] font-medium text-center px-1">
                Change
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
            <div className="space-y-1">
              <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                {uploading ? 'Uploading...' : 'Upload Logo'}
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
              {logoImage && (
                <button
                  type="button"
                  onClick={() => setLogoImage('')}
                  className="block text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Badge (read-only) */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Featured Badge</label>
        {profile.isVerified ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/40 text-green-400 text-xs font-semibold">
            <span>✓</span> Verified Creator
          </span>
        ) : profile.isTopCreator ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 text-xs font-semibold">
            <span>★</span> Top Creator
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground text-xs">
            No badge yet (assigned by admin)
          </span>
        )}
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Display Name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'appearance-error' : undefined}
          className={inputCls}
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Tell fans about yourself..."
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'appearance-error' : undefined}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Commission Status */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Commission Status</label>
        <select
          value={commissionStatus}
          onChange={(e) => setCommissionStatus(e.target.value)}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'appearance-error' : undefined}
          className={inputCls}
        >
          {COMMISSION_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Announcement */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">Announcement</label>
        <textarea
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Post an announcement for visitors..."
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'appearance-error' : undefined}
          className={`${inputCls} resize-none`}
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={announcementActive}
            onChange={(e) => setAnnouncementActive(e.target.checked)}
            className="rounded border-border bg-card text-primary focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">Show announcement on my profile</span>
        </label>
      </div>

      {/* Category Tags */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Category Tags</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleCategory(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryTags.includes(c.value)
                  ? 'bg-primary text-white'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">Social Links</label>
        {SOCIAL_PLATFORMS.map((p) => (
          <div key={p.key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="sm:w-28 text-xs text-muted-foreground sm:shrink-0">{p.label}</span>
            <input
              type="url"
              value={socialLinks[p.key] ?? ''}
              onChange={(e) => setSocialLinks((prev) => ({ ...prev, [p.key]: e.target.value }))}
              placeholder={p.placeholder}
              className={inputCls}
            />
          </div>
        ))}
      </div>

      <div>
        <button type="submit" disabled={saving || uploading} className={btnPrimary}>
          {saving ? 'Saving...' : 'Save Appearance'}
        </button>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — PORTFOLIO
// ═══════════════════════════════════════════════════════════════════════════════

function PortfolioTab({ profile }: { profile: CreatorProfile }) {
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
      {error && <ErrorAlert msg={error} id="portfolio-error" />}
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
            className="flex flex-col sm:flex-row gap-3 rounded-xl bg-surface border border-border p-3"
          >
            <div className="flex gap-3 flex-1 min-w-0">
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
            </div>

            {/* Controls */}
            <div className="flex sm:flex-col gap-1 sm:shrink-0 flex-wrap justify-end pt-2 sm:pt-0 border-t sm:border-0 border-border">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(idx, 'up')}
                  disabled={idx === 0}
                  className="w-8 h-8 sm:w-6 sm:h-6 rounded bg-card border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs flex items-center justify-center transition-colors"
                  title="Move up"
                >▲</button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 'down')}
                  disabled={idx === items.length - 1}
                  className="w-8 h-8 sm:w-6 sm:h-6 rounded bg-card border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs flex items-center justify-center transition-colors"
                  title="Move down"
                >▼</button>
              </div>
              <button
                type="button"
                onClick={() => togglePublic(item.id)}
                className={`px-3 py-1.5 sm:px-2 sm:py-1 rounded text-xs sm:text-[10px] font-medium transition-colors ${
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
                className="px-3 py-1.5 sm:px-2 sm:py-1 rounded text-xs sm:text-[10px] font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
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
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'portfolio-error' : undefined}
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
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'portfolio-error' : undefined}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'portfolio-error' : undefined}
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

          <div className="flex flex-col sm:flex-row gap-2">
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
              className="w-full sm:w-auto px-4 py-3 sm:py-2.5 rounded-lg bg-card border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
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

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — STORE
// ═══════════════════════════════════════════════════════════════════════════════

function StoreTab({ profile }: { profile: CreatorProfile }) {
  const router = useRouter()
  const [commissionSlots, setCommissionSlots] = useState<string>(
    profile.commissionSlots !== null && profile.commissionSlots !== undefined
      ? String(profile.commissionSlots)
      : ''
  )
  const [commissionDescription, setCommissionDescription] = useState(profile.commissionDescription ?? '')
  const [commissionTerms, setCommissionTerms] = useState(profile.commissionTerms ?? '')
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(parsePricing(profile.commissionPricing))
  const [absorbProcessingFee, setAbsorbProcessingFee] = useState(profile.absorbProcessingFee)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function addTier() {
    if (pricingTiers.length >= 3) return
    setPricingTiers((prev) => [...prev, { tier: '', price: 0, description: '' }])
  }

  function removeTier(idx: number) {
    setPricingTiers((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateTier(idx: number, field: keyof PricingTier, value: string | number) {
    setPricingTiers((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  async function handleSave() {
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionSlots: commissionSlots === '' ? null : Number(commissionSlots),
          commissionDescription: commissionDescription || null,
          commissionTerms: commissionTerms || null,
          commissionPricing: pricingTiers,
          absorbProcessingFee,
        }),
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
      {error && <ErrorAlert msg={error} id="store-error" />}
      {success && <SuccessAlert msg="Store settings saved." />}

      {/* Commission Slots */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Open Slots Available</label>
        <input
          type="number"
          min={0}
          value={commissionSlots}
          onChange={(e) => setCommissionSlots(e.target.value)}
          placeholder="Unlimited"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'store-error' : undefined}
          className="w-full sm:w-40 rounded-lg bg-card border border-border px-3 py-2 text-base sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          How many commission slots are currently open? Leave blank for unlimited.
        </p>
      </div>

      {/* Commission Introduction */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Commission Introduction
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          Introduce your commissions to potential clients
        </p>
        <textarea
          value={commissionDescription}
          onChange={(e) => setCommissionDescription(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="Tell fans what kind of commissions you offer, your style, what makes your work special..."
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'store-error' : undefined}
          className={`${inputCls} resize-none`}
        />
        <p className="mt-1 text-xs text-muted-foreground">{commissionDescription.length}/1000 characters</p>
      </div>

      {/* Commission Pricing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Pricing Tiers</label>
          {pricingTiers.length < 3 && (
            <button
              type="button"
              onClick={addTier}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors"
            >
              + Add Tier
            </button>
          )}
        </div>
        {pricingTiers.length === 0 && (
          <p className="text-xs text-muted-foreground">No pricing tiers yet. Add up to 3 tiers.</p>
        )}
        {pricingTiers.map((tier, idx) => (
          <div key={idx} className="rounded-xl bg-surface border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tier {idx + 1}</span>
              <button
                type="button"
                onClick={() => removeTier(idx)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tier Name</label>
                <input
                  value={tier.tier}
                  onChange={(e) => updateTier(idx, 'tier', e.target.value)}
                  placeholder="e.g. Basic, Standard, Premium"
                  maxLength={60}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Price (USD)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={tier.price}
                  onChange={(e) => updateTier(idx, 'price', parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description</label>
              <textarea
                value={tier.description}
                onChange={(e) => updateTier(idx, 'description', e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="What's included in this tier?"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Commission Terms */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Commission Terms</label>
        <textarea
          value={commissionTerms}
          onChange={(e) => setCommissionTerms(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="Describe your process, turnaround time, revision policy, usage rights, etc."
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'store-error' : undefined}
          className={`${inputCls} resize-none`}
        />
        <p className="mt-1 text-xs text-muted-foreground">{commissionTerms.length}/2000 characters</p>
      </div>

      {/* Absorb Processing Fee */}
      <div className="rounded-xl bg-surface border border-border p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={absorbProcessingFee}
            onChange={(e) => setAbsorbProcessingFee(e.target.checked)}
            className="rounded border-border bg-card text-primary focus:ring-ring"
          />
          <div>
            <span className="text-sm font-medium text-foreground">Absorb processing fee</span>
            <p className="text-xs text-muted-foreground mt-0.5">Members won't see extra charges — the fee comes out of your payout instead.</p>
          </div>
        </label>
      </div>

      <div>
        <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? 'Saving...' : 'Save Store Settings'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

function SettingsTab({ profile }: { profile: CreatorProfile }) {
  // Change Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  // Change Slug
  const [newSlug, setNewSlug] = useState('')
  const [slugSaving, setSlugSaving] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [slugSuccess, setSlugSuccess] = useState(false)

  // Delete Account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters')
      return
    }
    setPwSaving(true)
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_password', currentPassword, newPassword }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setPwError(body.error ?? 'Failed to change password')
        return
      }
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPwError('Something went wrong')
    } finally {
      setPwSaving(false)
    }
  }

  async function handleChangeSlug(e: React.FormEvent) {
    e.preventDefault()
    setSlugError(null)
    setSlugSuccess(false)
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(newSlug)) {
      setSlugError('Letters, numbers, hyphens, underscores only (3–30 characters)')
      return
    }
    setSlugSaving(true)
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_slug', slug: newSlug }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setSlugError(body.error ?? 'Failed to change username')
        return
      }
      setSlugSuccess(true)
      setNewSlug('')
    } catch {
      setSlugError('Something went wrong')
    } finally {
      setSlugSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null)
    setDeleteSaving(true)
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_account', confirmEmail: deleteEmail }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setDeleteError(body.error ?? 'Failed to delete account')
        return
      }
      window.location.href = '/'
    } catch {
      setDeleteError('Something went wrong')
    } finally {
      setDeleteSaving(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* Change Password */}
      <section className="rounded-xl bg-surface border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
        {pwError && <ErrorAlert msg={pwError} id="password-error" />}
        {pwSuccess && <SuccessAlert msg="Password changed successfully." />}
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              aria-invalid={!!pwError || undefined}
              aria-describedby={pwError ? 'password-error' : undefined}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              aria-invalid={!!pwError || undefined}
              aria-describedby={pwError ? 'password-error' : undefined}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              aria-invalid={!!pwError || undefined}
              aria-describedby={pwError ? 'password-error' : undefined}
              className={inputCls}
            />
          </div>
          <button type="submit" disabled={pwSaving} className={btnPrimary}>
            {pwSaving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* Change Username / Slug */}
      <section className="rounded-xl bg-surface border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Username / Profile URL</h2>
        <div className="text-xs text-muted-foreground">
          Current:{' '}
          <span className="font-mono text-primary">{profile.username}</span>
        </div>
        {slugError && <ErrorAlert msg={slugError} id="slug-error" />}
        {slugSuccess && <SuccessAlert msg="Username updated successfully." />}
        <form onSubmit={handleChangeSlug} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">New Username</label>
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder={profile.username}
              maxLength={30}
              aria-invalid={!!slugError || undefined}
              aria-describedby={slugError ? 'slug-error' : undefined}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-muted-foreground">Letters, numbers, hyphens, underscores only (3–30 characters).</p>
          </div>
          <button type="submit" disabled={slugSaving || !newSlug.trim()} className={btnPrimary}>
            {slugSaving ? 'Saving...' : 'Update Username'}
          </button>
        </form>
      </section>

      {/* Payment Method */}
      <section className="rounded-xl bg-surface border border-border p-5 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Payment Method</h2>
        <div className="rounded-lg bg-card border border-border px-4 py-4 text-sm text-muted-foreground">
          Payment method connection coming soon. You can request payouts from the{' '}
          <a href="/dashboard/earnings" className="text-primary hover:underline">Earnings page</a>.
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl bg-red-500/5 border border-red-500/30 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
        {deleteError && <ErrorAlert msg={deleteError} id="delete-error" />}
        {!showDeleteConfirm ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto px-4 py-3 sm:py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-sm font-medium transition-colors"
            >
              Delete My Account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300 font-medium">
              Are you sure? This will permanently delete your account.
            </p>
            <p className="text-xs text-muted-foreground">Type your email address to confirm:</p>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder="your@email.com"
              aria-invalid={!!deleteError || undefined}
              aria-describedby={deleteError ? 'delete-error' : undefined}
              className={`${inputCls} border-red-500/30 focus:ring-red-500`}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteSaving || !deleteEmail.trim()}
                className="w-full sm:w-auto px-4 py-3 sm:py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteSaving ? 'Deleting...' : 'Confirm Delete Account'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteEmail(''); setDeleteError(null) }}
                className="w-full sm:w-auto px-4 py-3 sm:py-2.5 rounded-lg bg-card border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const TABS: { id: Tab; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'store', label: 'Store' },
  { id: 'settings', label: 'Settings' },
]

export function ProfileForm({ profile }: { profile: CreatorProfile }) {
  const [activeTab, setActiveTab] = useState<Tab>('appearance')

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="flex border-b border-border mb-6 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'appearance' && <AppearanceTab profile={profile} />}
      {activeTab === 'portfolio' && <PortfolioTab profile={profile} />}
      {activeTab === 'store' && <StoreTab profile={profile} />}
      {activeTab === 'settings' && <SettingsTab profile={profile} />}
    </div>
  )
}
