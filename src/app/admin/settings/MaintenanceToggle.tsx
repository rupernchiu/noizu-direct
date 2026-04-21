'use client'
import { useState } from 'react'
import { AlertTriangle, Globe, Power } from 'lucide-react'

export function MaintenanceToggle({ enabled: initial, message: initialMessage }: { enabled: boolean; message: string }) {
  const [enabled, setEnabled] = useState(initial)
  const [message, setMessage] = useState(initialMessage)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    const next = !enabled
    setEnabled(next) // optimistic update immediately
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/maintenance/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next, message }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(`Failed: ${data.error ?? res.status}`)
        setEnabled(!next) // revert
      }
    } catch (e) {
      setError('Network error — could not reach server')
      setEnabled(!next) // revert
    }
    setSaving(false)
  }

  async function saveMessage() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/maintenance/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, message }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
      else setError(`Failed to save message: ${res.status}`)
    } catch {
      setError('Network error')
    }
    setSaving(false)
  }

  return (
    <div className={`rounded-xl border-2 p-5 space-y-4 transition-colors ${enabled ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-card'}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${enabled ? 'bg-red-500/20' : 'bg-muted/20'}`}>
            {enabled ? <AlertTriangle size={18} className="text-red-400" /> : <Globe size={18} className="text-muted-foreground" />}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Maintenance Mode</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabled ? 'Site is DOWN — visitors see the maintenance page' : 'Site is LIVE — visitors see the normal site'}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={toggle}
          disabled={saving}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${enabled ? 'bg-red-500' : 'bg-muted'}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${enabled ? 'translate-x-8' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${enabled ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          <Power size={11} />
          {enabled ? 'MAINTENANCE ON' : 'SITE LIVE'}
        </span>
        {saved && <span className="text-xs text-green-400">Saved ✓</span>}
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>

      {/* Custom message */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-medium">Custom maintenance message (optional)</label>
        <div className="flex gap-2">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="We'll be back shortly…"
            className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={saveMessage}
            disabled={saving}
            className="px-3 py-2 text-xs font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 disabled:opacity-50 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertTriangle size={11} /> {error}
        </p>
      )}
      {enabled && !error && (
        <p className="text-xs text-red-400/80 flex items-center gap-1.5">
          <AlertTriangle size={11} />
          Admin panel at /admin is still accessible. Only you can turn this off.
        </p>
      )}
    </div>
  )
}
