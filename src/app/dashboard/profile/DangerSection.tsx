'use client'
import { useState } from 'react'

function ErrorAlert({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
      {msg}
    </div>
  )
}

export function DangerSection() {
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [deactivated, setDeactivated] = useState(false)

  async function handleDeactivate() {
    setDeactivateError(null)
    setDeactivating(true)
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate_store' }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setDeactivateError(body.error ?? 'Failed to deactivate store')
        return
      }
      setDeactivated(true)
      setShowDeactivateModal(false)
    } catch {
      setDeactivateError('Something went wrong')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mt-1">Irreversible actions — proceed with caution.</p>
      </div>

      {/* Deactivate Store */}
      <div className="rounded-xl bg-orange-500/5 border border-orange-500/30 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-orange-400">Deactivate Store</h3>
        <p className="text-sm text-muted-foreground">
          Your store will be hidden from the marketplace. You can reactivate it by contacting support.
        </p>
        {deactivateError && <ErrorAlert msg={deactivateError} />}
        {deactivated && (
          <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-3 text-sm text-orange-400">
            Your store has been deactivated.
          </div>
        )}
        {!deactivated && (
          <button
            type="button"
            onClick={() => setShowDeactivateModal(true)}
            className="px-4 py-2.5 rounded-lg bg-orange-500/10 border border-orange-500/40 text-orange-400 hover:bg-orange-500/20 text-sm font-medium transition-colors"
          >
            Deactivate Store
          </button>
        )}
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground">Deactivate Store?</h3>
            <p className="text-sm text-muted-foreground">
              Your store will be hidden from the marketplace. Existing orders will not be affected.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deactivating ? 'Deactivating...' : 'Deactivate Store'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeactivateModal(false); setDeactivateError(null) }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-card border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
