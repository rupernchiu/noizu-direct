'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload } from 'lucide-react'
import { DigitalFilesUpload, type DigitalFile } from '@/components/ui/DigitalFilesUpload'

interface Props {
  milestoneId: string
  status: string
}

export function MilestoneCreatorActions({ milestoneId, status }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<DigitalFile[]>([])
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)

  const canDeliver = status === 'PENDING' || status === 'IN_PROGRESS' || status === 'REVISION_REQUESTED'
  if (!canDeliver) return null

  async function submit() {
    if (files.length === 0) { setError('Upload at least one delivery file'); return }
    setBusy(true); setError(null)
    const res = await fetch(`/api/commissions/milestones/${milestoneId}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryFiles: files.map(f => ({ key: f.key, filename: f.filename, size: f.size, mime: f.mime })),
        deliveryNote: note || undefined,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to deliver')
      setBusy(false)
      return
    }
    setBusy(false); setOpen(false); setFiles([]); setNote('')
    router.refresh()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium"
      >
        <Upload className="size-3.5" /> Deliver milestone
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3 mt-2">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Delivery files</p>
        <DigitalFilesUpload files={files} onChange={setFiles} maxFiles={10} />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Message to buyer (optional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          placeholder="Notes for the buyer about this milestone"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || files.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Submit delivery
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setFiles([]); setNote(''); setError(null) }}
          disabled={busy}
          className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-card"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        After delivery, the buyer has 14 days to approve or request a revision. If no action, this milestone&apos;s amount auto-releases to you.
      </p>
    </div>
  )
}
