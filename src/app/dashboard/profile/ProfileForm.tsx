'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

interface CreatorProfile {
  displayName: string | null
  bio: string | null
  avatar: string | null
  bannerImage: string | null
  commissionStatus: string
  announcementText: string | null
  announcementActive: boolean
  absorbProcessingFee: boolean
  categoryTags: string | null
  socialLinks: string | null
}

function parseTags(raw: string | null): string[] {
  try { return JSON.parse(raw ?? '[]') as string[] } catch { return [] }
}

function parseLinks(raw: string | null): Record<string, string> {
  try { return JSON.parse(raw ?? '{}') as Record<string, string> } catch { return {} }
}

export function ProfileForm({ profile }: { profile: CreatorProfile }) {
  const router = useRouter()

  const [displayName, setDisplayName] = useState(profile.displayName ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [commissionStatus, setCommissionStatus] = useState(profile.commissionStatus)
  const [announcementText, setAnnouncementText] = useState(profile.announcementText ?? '')
  const [announcementActive, setAnnouncementActive] = useState(profile.announcementActive)
  const [absorbProcessingFee, setAbsorbProcessingFee] = useState(profile.absorbProcessingFee)
  const [categoryTags, setCategoryTags] = useState<string[]>(parseTags(profile.categoryTags))
  const [socialLinks, setSocialLinks] = useState(parseLinks(profile.socialLinks))
  const [avatar, setAvatar] = useState(profile.avatar ?? '')
  const [bannerImage, setBannerImage] = useState(profile.bannerImage ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function uploadFile(file: File, subdir: string): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('subdir', subdir)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json() as { url: string }
    return data.url
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, 'avatars')
      setAvatar(url)
    } catch {
      setError('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, 'banners')
      setBannerImage(url)
    } catch {
      setError('Failed to upload banner')
    } finally {
      setUploading(false)
    }
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
          absorbProcessingFee,
          avatar: avatar || undefined,
          bannerImage: bannerImage || undefined,
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
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-[#00d4aa]/10 border border-[#00d4aa]/30 px-4 py-3 text-sm text-[#00d4aa]">
          Profile saved successfully.
        </div>
      )}

      {/* Avatar & Banner */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Banner Image</label>
          <div className="relative h-28 w-full rounded-xl overflow-hidden bg-gradient-to-r from-[#7c3aed]/30 to-[#00d4aa]/30 border border-[#2a2a3a]">
            {bannerImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
            )}
            <label className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30 hover:bg-black/40 transition-colors text-white text-xs font-medium">
              {uploading ? 'Uploading...' : 'Change Banner'}
              <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#7c3aed]/30 border-2 border-[#2a2a3a] shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[#7c3aed]">
                {displayName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/40 opacity-0 hover:opacity-100 transition-opacity text-white text-[10px] font-medium text-center px-1">
              Change
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <div className="text-sm text-[#8888aa]">Click to upload a new avatar (square image recommended)</div>
        </div>
      </div>

      {/* Display name */}
      <div>
        <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Display Name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Tell fans about yourself..."
          className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-none"
        />
      </div>

      {/* Commission Status */}
      <div>
        <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Commission Status</label>
        <select
          value={commissionStatus}
          onChange={(e) => setCommissionStatus(e.target.value)}
          className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
        >
          {COMMISSION_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Announcement */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#f0f0f5]">Announcement</label>
        <textarea
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Post an announcement for visitors..."
          className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-none"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={announcementActive}
            onChange={(e) => setAnnouncementActive(e.target.checked)}
            className="rounded border-[#2a2a3a] bg-[#1e1e2a] text-[#7c3aed] focus:ring-[#7c3aed]"
          />
          <span className="text-sm text-[#8888aa]">Show announcement on my profile</span>
        </label>
      </div>

      {/* Absorb processing fee */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={absorbProcessingFee}
            onChange={(e) => setAbsorbProcessingFee(e.target.checked)}
            className="rounded border-[#2a2a3a] bg-[#1e1e2a] text-[#7c3aed] focus:ring-[#7c3aed]"
          />
          <span className="text-sm text-[#f0f0f5]">Absorb processing fee <span className="text-[#8888aa]">(buyers won't see extra charges)</span></span>
        </label>
      </div>

      {/* Category tags */}
      <div>
        <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Category Tags</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleCategory(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryTags.includes(c.value)
                  ? 'bg-[#7c3aed] text-white'
                  : 'bg-[#1e1e2a] border border-[#2a2a3a] text-[#8888aa] hover:text-[#f0f0f5]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Social links */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#f0f0f5]">Social Links</label>
        {(['twitter', 'instagram', 'website'] as const).map((platform) => (
          <div key={platform} className="flex items-center gap-2">
            <span className="w-24 text-xs text-[#8888aa] capitalize">{platform}</span>
            <input
              type="url"
              value={socialLinks[platform] ?? ''}
              onChange={(e) => setSocialLinks((prev) => ({ ...prev, [platform]: e.target.value }))}
              placeholder={`https://${platform === 'website' ? 'yoursite.com' : `${platform}.com/handle`}`}
              className="flex-1 rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
            />
          </div>
        ))}
      </div>

      <div>
        <button
          type="submit"
          disabled={saving || uploading}
          className="px-6 py-2.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  )
}
