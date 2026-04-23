'use client'

// Dispute evidence panel (party view).
//
// Read model: DisputeEvidence rows belonging to this dispute (supersededAt IS NULL),
// partitioned into "yours" (items.role === myRole) and "counter-party".
//
// Write model: append-only. Uploading a fresh file POSTs the bytes to
// /api/upload (category=dispute_evidence) then POSTs the resulting viewer URL
// + r2Key to /api/account/disputes/[id]/evidence. Replacing an existing
// DisputeEvidence row follows the same flow with a `supersedesId` reference
// so the server marks the old row superseded atomically.
//
// Users CANNOT delete evidence. If they need to correct, they Replace.
//
// Fire-and-forget OWNER_SELF_VIEW audit rows are handled server-side by the
// /api/files route (on every successful byte stream). We don't need a
// separate client-side server action here because rendering an <img> from
// the viewer URL causes the browser to GET /api/files/..., which logs.

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Upload as UploadIcon, FileText, ShieldCheck } from 'lucide-react'

export interface EvidenceItem {
  id: string
  role: 'RAISER' | 'CREATOR'
  uploaderName: string | null
  isMine: boolean
  viewerUrl: string
  mimeType: string | null
  fileSize: number | null
  note: string | null
  uploadedAt: string
}

interface Props {
  disputeId: string
  myRole: 'RAISER' | 'CREATOR'
  items: EvidenceItem[]
  canUpload: boolean
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(iso))
}

export function DisputeEvidenceSection({ disputeId, myRole, items, canUpload }: Props) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)

  const mine = items.filter((i) => i.role === myRole)
  const counter = items.filter((i) => i.role !== myRole)
  const counterLabel = myRole === 'RAISER' ? "Creator's evidence" : "Buyer's evidence"

  const doUpload = useCallback(
    async (file: File, opts: { noteText: string; supersedesId: string | null }) => {
      setUploading(true)
      setError('')
      try {
        const fd = new globalThis.FormData()
        fd.append('file', file)
        fd.append('category', 'dispute_evidence')
        fd.append('subdir', 'dispute-evidence')
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!upRes.ok) {
          const body = (await upRes.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Upload failed')
        }
        const upData = (await upRes.json()) as {
          url: string
          mimeType: string
          fileSize: number
        }

        const postRes = await fetch(`/api/account/disputes/${disputeId}/evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            viewerUrl: upData.url,
            mimeType: upData.mimeType,
            fileSize: upData.fileSize,
            note: opts.noteText || null,
            supersedesId: opts.supersedesId,
          }),
        })
        if (!postRes.ok) {
          const body = (await postRes.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to attach evidence')
        }

        setNote('')
        setReplacingId(null)
        router.refresh()
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setUploading(false)
      }
    },
    [disputeId, router],
  )

  function onAddChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    void doUpload(f, { noteText: note, supersedesId: null })
  }

  function onReplaceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    const id = replacingId
    e.target.value = ''
    if (!f || !id) return
    void doUpload(f, { noteText: '', supersedesId: id })
  }

  function startReplace(id: string) {
    setReplacingId(id)
    // Kick the file picker on the next tick so the state update lands first.
    setTimeout(() => replaceRef.current?.click(), 0)
  }

  return (
    <div className="space-y-6">
      {/* Your evidence */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Your Evidence
          </h2>
          <p className="text-[11px] text-muted-foreground italic">
            Append-only — replace instead of deleting
          </p>
        </div>

        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground italic mb-4">
            You haven&apos;t attached any evidence yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {mine.map((item) => (
              <EvidenceTile key={item.id} item={item} onReplace={canUpload ? () => startReplace(item.id) : undefined} />
            ))}
          </div>
        )}

        {canUpload ? (
          <div className="space-y-2 pt-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground">Add new evidence</p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note or caption…"
              maxLength={500}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
              disabled={uploading}
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="hidden"
                onChange={onAddChange}
                disabled={uploading}
              />
              <input
                ref={replaceRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="hidden"
                onChange={onReplaceChange}
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <UploadIcon className="size-4" />
                {uploading ? 'Uploading…' : 'Upload evidence'}
              </button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            This dispute is resolved — additional evidence can no longer be attached.
          </p>
        )}
      </section>

      {/* Counter-party evidence */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {counterLabel}
          </h2>
        </div>

        {counter.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {myRole === 'RAISER'
              ? "The creator hasn't attached any evidence yet."
              : "The buyer hasn't attached any evidence yet."}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {counter.map((item) => (
              <EvidenceTile key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function EvidenceTile({
  item,
  onReplace,
}: {
  item: EvidenceItem
  onReplace?: () => void
}) {
  const isImage = item.mimeType?.startsWith('image/') ?? false
  return (
    <div className="group rounded-lg border border-border bg-background overflow-hidden flex flex-col">
      <a
        href={item.viewerUrl}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        className="block aspect-square relative bg-surface"
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.viewerUrl}
            alt={item.note ?? 'Evidence'}
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <FileText className="size-6" />
            <span className="text-[10px] uppercase tracking-wide">
              {(item.mimeType ?? 'file').split('/').pop()}
            </span>
          </div>
        )}
      </a>
      <div className="px-2 py-1.5 space-y-0.5">
        {item.note && (
          <p className="text-[11px] text-foreground leading-snug line-clamp-2">{item.note}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {item.uploaderName ?? 'Unknown'} · {formatDate(item.uploadedAt)}
        </p>
        {onReplace && (
          <button
            type="button"
            onClick={onReplace}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <RefreshCw className="size-3" />
            Replace
          </button>
        )}
      </div>
    </div>
  )
}
