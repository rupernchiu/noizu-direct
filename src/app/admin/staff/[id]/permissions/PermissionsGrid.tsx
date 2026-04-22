'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Permission {
  id: string; shortcode: string; displayName: string
  component: string; action: string; description: string | null
}

interface Props {
  staffUserId: string
  grouped: Record<string, Permission[]>
  currentMap: Record<string, string | null>  // permissionId → expiresAt ISO or null
  isSuperAdmin: boolean
}

export function PermissionsGrid({ staffUserId, grouped, currentMap, isSuperAdmin }: Props) {
  const router = useRouter()

  // checked: Set of permissionId
  const [checked, setChecked] = useState<Set<string>>(() => new Set(Object.keys(currentMap)))
  // expiries: permissionId → ISO date string or ''
  const [expiries, setExpiries] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const [id, exp] of Object.entries(currentMap)) {
      init[id] = exp ? exp.slice(0, 10) : '' // date input needs YYYY-MM-DD
    }
    return init
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggle(permId: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
  }

  function setExpiry(permId: string, value: string) {
    setExpiries((prev) => ({ ...prev, [permId]: value }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const grants = Array.from(checked).map((permId) => ({
        staffPermissionId: permId,
        expiresAt: expiries[permId] ? new Date(expiries[permId]).toISOString() : null,
      }))
      const res = await fetch(`/api/admin/staff/${staffUserId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grants }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const components = Object.keys(grouped).sort()

  return (
    <div className="space-y-4">
      {isSuperAdmin && (
        <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          This user is a Super Admin and bypasses all permission checks regardless of what&apos;s set here.
        </div>
      )}

      {error && (
        <p id="permissions-error" role="alert" className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</p>
      )}

      {components.map((component) => (
        <div key={component} className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-background/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{component}</p>
          </div>
          <div className="divide-y divide-border">
            {grouped[component].map((perm) => {
              const isChecked = checked.has(perm.id)
              return (
                <div key={perm.id} className="flex items-center gap-4 px-4 py-3">
                  <input
                    suppressHydrationWarning
                    type="checkbox"
                    id={perm.id}
                    checked={isChecked}
                    onChange={() => toggle(perm.id)}
                    className="w-4 h-4 rounded border-border accent-primary flex-shrink-0"
                  />
                  <label htmlFor={perm.id} className="flex-1 min-w-0 cursor-pointer">
                    <p className="text-sm font-medium text-foreground">{perm.displayName}</p>
                    {perm.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                    )}
                  </label>
                  {isChecked && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label className="text-xs text-muted-foreground">Expires</label>
                      <input
                        suppressHydrationWarning
                        type="date"
                        value={expiries[perm.id] ?? ''}
                        onChange={(e) => setExpiry(perm.id, e.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                        className="px-2 py-1 rounded-lg bg-background border border-border text-xs text-foreground outline-none focus-visible:border-primary"
                      />
                      {expiries[perm.id] && (
                        <button
                          suppressHydrationWarning
                          type="button"
                          onClick={() => setExpiry(perm.id, '')}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">{checked.size} permission{checked.size !== 1 ? 's' : ''} selected</p>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Permissions'}
        </button>
      </div>
    </div>
  )
}
