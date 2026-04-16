'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const btnPrimary =
  'px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

interface NotifChannel {
  newOrder: boolean
  fulfillmentReminder: boolean
  escrowReleased: boolean
  newMessage: boolean
  disputeRaised: boolean
  payoutProcessed: boolean
}

interface NotifPrefs {
  email: NotifChannel
  inApp: NotifChannel
}

const NOTIF_TYPES: { key: keyof NotifChannel; label: string }[] = [
  { key: 'newOrder', label: 'New order received' },
  { key: 'fulfillmentReminder', label: 'Fulfillment reminders' },
  { key: 'escrowReleased', label: 'Escrow released' },
  { key: 'newMessage', label: 'New message' },
  { key: 'disputeRaised', label: 'Dispute raised' },
  { key: 'payoutProcessed', label: 'Payout processed' },
]

const DEFAULT_CHANNEL: NotifChannel = {
  newOrder: true,
  fulfillmentReminder: true,
  escrowReleased: true,
  newMessage: true,
  disputeRaised: true,
  payoutProcessed: true,
}

function parseNotifPrefs(raw: string | null): NotifPrefs {
  try {
    const parsed = JSON.parse(raw ?? '{}') as Partial<NotifPrefs>
    return {
      email: { ...DEFAULT_CHANNEL, ...(parsed.email ?? {}) },
      inApp: { ...DEFAULT_CHANNEL, ...(parsed.inApp ?? {}) },
    }
  } catch {
    return { email: { ...DEFAULT_CHANNEL }, inApp: { ...DEFAULT_CHANNEL } }
  }
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
  profile: { notifPrefs?: string | null }
}

export function NotificationsSection({ profile }: Props) {
  const router = useRouter()
  const [prefs, setPrefs] = useState<NotifPrefs>(parseNotifPrefs(profile.notifPrefs ?? null))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function toggle(channel: 'email' | 'inApp', key: keyof NotifChannel) {
    setPrefs((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [key]: !prev[channel][key] },
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifPrefs: prefs }),
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
        <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose how and when you get notified.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && <ErrorAlert msg={error} />}
        {success && <SuccessAlert msg="Notification preferences saved." />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Notifications */}
          <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Email Notifications</h3>
            <div className="space-y-3">
              {NOTIF_TYPES.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer gap-3">
                  <span className="text-sm text-foreground">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs.email[key]}
                    onClick={() => toggle('email', key)}
                    className={`relative w-10 h-5 rounded-full transition-colors border ${
                      prefs.email[key]
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                        prefs.email[key] ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>

          {/* In-App Notifications */}
          <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">In-App Notifications</h3>
            <div className="space-y-3">
              {NOTIF_TYPES.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer gap-3">
                  <span className="text-sm text-foreground">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs.inApp[key]}
                    onClick={() => toggle('inApp', key)}
                    className={`relative w-10 h-5 rounded-full transition-colors border ${
                      prefs.inApp[key]
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                        prefs.inApp[key] ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving...' : 'Save Notifications'}
          </button>
        </div>
      </form>
    </div>
  )
}
