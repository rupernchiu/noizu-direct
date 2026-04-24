'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const inputCls =
  'w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const btnPrimary =
  'px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

const CATEGORY_OPTIONS = [
  { value: 'DIGITAL_ART', label: 'Digital Art' },
  { value: 'DOUJIN', label: 'Doujin' },
  { value: 'COSPLAY_PRINT', label: 'Cosplay Print' },
  { value: 'PHYSICAL_MERCH', label: 'Physical Merch' },
  { value: 'STICKERS', label: 'Stickers' },
  { value: 'ILLUSTRATION', label: 'Illustration' },
  { value: 'PHOTOGRAPHY', label: 'Photography' },
  { value: 'POD', label: 'POD' },
  { value: 'OTHER', label: 'Other' },
]

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/handle' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@handle' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/handle' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/handle' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@handle' },
  { key: 'website', label: 'Website', placeholder: 'https://yoursite.com' },
] as const

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

function parseTags(raw: string | null): string[] {
  try { return JSON.parse(raw ?? '[]') as string[] } catch { return [] }
}
function parseLinks(raw: string | null): Record<string, string> {
  try { return JSON.parse(raw ?? '{}') as Record<string, string> } catch { return {} }
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

async function uploadFile(file: File, subdir: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('subdir', subdir)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json() as { url: string }
  return data.url
}

interface Profile {
  username: string
  displayName: string | null
  bio: string | null
  avatar: string | null
  bannerImage: string | null
  categoryTags: string | null
  socialLinks: string | null
  commissionStatus: string
  commissionDescription: string | null
  announcementText: string | null
  announcementActive: boolean
}

interface Props {
  profile: Profile
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function StoreSection({ profile }: Props) {
  const router = useRouter()
  const bannerRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(profile.displayName ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatar, setAvatar] = useState(profile.avatar ?? '')
  const [bannerImage, setBannerImage] = useState(profile.bannerImage ?? '')
  const [username, setUsername] = useState(profile.username)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [usernameMsg, setUsernameMsg] = useState('')
  const [categoryTags, setCategoryTags] = useState<string[]>(parseTags(profile.categoryTags))
  const [socialLinks, setSocialLinks] = useState(parseLinks(profile.socialLinks))
  const [commissionStatus, setCommissionStatus] = useState(profile.commissionStatus)
  const [commissionDescription, setCommissionDescription] = useState(profile.commissionDescription ?? '')
  const [announcementText, setAnnouncementText] = useState(profile.announcementText ?? '')
  const [announcementActive, setAnnouncementActive] = useState(profile.announcementActive)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const checkUsername = useCallback(async (value: string) => {
    if (!value || value === profile.username) {
      setUsernameStatus('idle')
      setUsernameMsg('')
      return
    }
    if (!USERNAME_REGEX.test(value)) {
      setUsernameStatus('invalid')
      setUsernameMsg('Lowercase letters, numbers, underscores only (3–30 chars)')
      return
    }
    setUsernameStatus('checking')
    setUsernameMsg('Checking...')
    try {
      const res = await fetch(`/api/dashboard/profile/check-username?username=${encodeURIComponent(value)}`)
      const data = await res.json() as { available: boolean; message: string }
      setUsernameStatus(data.available ? 'available' : 'taken')
      setUsernameMsg(data.message)
    } catch {
      setUsernameStatus('idle')
      setUsernameMsg('')
    }
  }, [profile.username])

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(username), 500)
    return () => clearTimeout(timer)
  }, [username, checkUsername])

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setBannerImage(await uploadFile(file, 'banners')) }
    catch { setError('Failed to upload banner') }
    finally { setUploading(false) }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { setAvatar(await uploadFile(file, 'avatars')) }
    catch { setError('Failed to upload avatar') }
    finally { setUploading(false) }
  }

  function toggleCategory(value: string) {
    setCategoryTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      setError('Please fix the username before saving')
      return
    }
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
          avatar: avatar || undefined,
          bannerImage: bannerImage || undefined,
          username,
          categoryTags,
          socialLinks,
          commissionStatus,
          commissionDescription: commissionDescription || null,
          announcementText,
          announcementActive,
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

  const usernameColorCls =
    usernameStatus === 'available' ? 'text-green-400' :
    usernameStatus === 'taken' ? 'text-destructive' :
    usernameStatus === 'checking' ? 'text-yellow-400' :
    usernameStatus === 'invalid' ? 'text-destructive' :
    ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Store Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Customize your public store appearance and information.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && <ErrorAlert msg={error} />}
        {success && <SuccessAlert msg="Store profile saved successfully." />}

        {/* Banner */}
        <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Store Banner</h3>
          <p className="text-xs text-muted-foreground -mt-2">Recommended: 1500×500 px (3:1), JPG or PNG, under 5&nbsp;MB.</p>
          <div
            className="relative h-32 w-full rounded-xl overflow-hidden bg-gradient-to-r from-primary/30 to-secondary/30 border border-border cursor-pointer"
            onClick={() => bannerRef.current?.click()}
          >
            {bannerImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 hover:bg-black/40 transition-colors text-white text-xs font-medium px-3 text-center">
              <span>{uploading ? 'Uploading...' : 'Click to change banner'}</span>
              {!uploading && (
                <span className="mt-0.5 text-[10px] font-normal text-white/80">1500×500 px · JPG/PNG · up to 5 MB</span>
              )}
            </div>
          </div>
          <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />

          <h3 className="text-sm font-semibold text-foreground pt-2">Store Avatar</h3>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-primary/20 border-2 border-border shrink-0 group"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="Store Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary">
                  {displayName[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-medium text-center px-1 leading-tight">
                {uploading ? (
                  <span>...</span>
                ) : (
                  <>
                    <span>Change</span>
                    <span className="text-[8px] font-normal text-white/80 mt-0.5">400×400 · 2 MB</span>
                  </>
                )}
              </div>
            </button>
            <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <p className="text-xs text-muted-foreground">Recommended: square image, 400×400 px (min 200×200), JPG or PNG, under 2&nbsp;MB.</p>
          </div>
        </div>

        {/* Store Info */}
        <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Store Information</h3>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Store Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              placeholder="Your store name"
              className={inputCls}
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Username</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">noizu.direct/creator/</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                maxLength={30}
                placeholder="username"
                className={inputCls}
              />
            </div>
            {usernameMsg && (
              <p className={`mt-1 text-xs ${usernameColorCls}`}>{usernameMsg}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Tell fans about yourself..."
              className={`${inputCls} resize-none`}
            />
            <p className="mt-1 text-xs text-muted-foreground">{bio.length}/500</p>
          </div>
        </div>

        {/* Category Tags */}
        <div className="rounded-xl bg-surface border border-border p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Category Tags</h3>
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
        <div className="rounded-xl bg-surface border border-border p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Social Links</h3>
          {SOCIAL_PLATFORMS.map((p) => (
            <div key={p.key} className="flex items-center gap-2">
              <span className="w-28 text-xs text-muted-foreground shrink-0">{p.label}</span>
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

        {/* Commission + Announcement */}
        <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Commission &amp; Announcement</h3>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Commission Status</label>
            <div className="flex gap-2">
              {(['OPEN', 'LIMITED', 'CLOSED'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setCommissionStatus(status)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    commissionStatus === status
                      ? status === 'OPEN'
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : status === 'LIMITED'
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                        : 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Commission Intro</label>
            <textarea
              value={commissionDescription}
              onChange={(e) => setCommissionDescription(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Tell fans what kind of commissions you offer..."
              className={`${inputCls} resize-none`}
            />
            <p className="mt-1 text-xs text-muted-foreground">{commissionDescription.length}/1000</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">Announcement</label>
            <input
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              maxLength={300}
              placeholder="Post an announcement for visitors..."
              className={inputCls}
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
        </div>

        <div>
          <button type="submit" disabled={saving || uploading || usernameStatus === 'taken' || usernameStatus === 'invalid'} className={btnPrimary}>
            {saving ? 'Saving...' : 'Save Store Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
