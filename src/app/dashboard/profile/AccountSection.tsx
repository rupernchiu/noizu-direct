'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const inputCls =
  'w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const btnPrimary =
  'px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

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

interface Props {
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
    legalFullName?: string | null
  }
}

export function AccountSection({ user }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // Account fields
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [legalFullName, setLegalFullName] = useState(user.legalFullName ?? '')
  const [phone, setPhone] = useState('')
  const [avatar, setAvatar] = useState(user.avatar ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Email expand state
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadFile(file, 'avatars')
      setAvatar(url)
      // Immediately persist avatar
      await fetch('/api/dashboard/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: url }),
      })
      router.refresh()
    } catch {
      setError('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          legalFullName: legalFullName.trim() || undefined,
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

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Failed to update email')
        return
      }
      setEmail(newEmail)
      setNewEmail('')
      setShowEmailForm(false)
      setSuccess(true)
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Account Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your account details and password.</p>
      </div>

      {/* Profile Picture */}
      <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Profile Picture</h3>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-28 h-28 rounded-full overflow-hidden bg-primary/20 border-2 border-border shrink-0 group"
            disabled={uploading}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary">
                {name[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
              {uploading ? 'Uploading...' : 'Change'}
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          <div className="text-sm text-muted-foreground">Click the avatar to upload a new photo. Square image recommended.</div>
        </div>
      </div>

      {/* Account Details */}
      <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Account Details</h3>
        {error && <ErrorAlert msg={error} />}
        {success && <SuccessAlert msg="Account settings saved." />}

        <form onSubmit={handleSaveAccount} className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className={inputCls}
            />
          </div>

          {/* Legal Full Name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Legal Full Name <span className="text-muted-foreground/60">(as shown on your ID)</span>
            </label>
            <input
              value={legalFullName}
              onChange={(e) => setLegalFullName(e.target.value)}
              placeholder="e.g. Ahmad Farhan bin Aziz"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Required to sign platform agreements. Must match your government-issued ID.
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <div className="flex items-center gap-2">
              <input
                value={email}
                readOnly
                className={`${inputCls} opacity-60 cursor-default`}
              />
              <button
                type="button"
                onClick={() => setShowEmailForm((v) => !v)}
                className="shrink-0 px-3 py-2 rounded-lg bg-card border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showEmailForm ? 'Cancel' : 'Change'}
              </button>
            </div>
            {showEmailForm && (
              <form onSubmit={handleChangeEmail} className="mt-2 flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="New email address"
                  required
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={saving || !newEmail.trim()}
                  className="shrink-0 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </form>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+60 12 345 6789"
              className={inputCls}
            />
          </div>

          <button type="submit" disabled={saving || uploading} className={btnPrimary}>
            {saving ? 'Saving...' : 'Save Account Settings'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
        {pwError && <ErrorAlert msg={pwError} />}
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
              className={inputCls}
            />
          </div>
          <button type="submit" disabled={pwSaving} className={btnPrimary}>
            {pwSaving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
