'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Upload as UploadIcon, RefreshCw, FileCheck2 } from 'lucide-react'
import { logKycSelfView } from './log-view'

export interface KycSlot {
  category: 'id_front' | 'id_back' | 'selfie'
  label: string
  description: string
  live: {
    id: string
    viewerUrl: string
    mimeType: string | null
    fileSize: number | null
    uploadedAt: string
  } | null
  supersededCount: number
}

interface Props {
  slots: KycSlot[]
  locked: boolean
  applicationStatus: string
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso))
}

export function KycSettingsClient({ slots, locked, applicationStatus }: Props) {
  const router = useRouter()
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fireOnce = useRef(false)

  // Fire-and-forget OWNER_SELF_VIEW audit rows for any live categories we
  // actually render a thumbnail for. Only runs when not locked (locked pages
  // do not render thumbnails → no access happens → no audit row).
  useEffect(() => {
    if (fireOnce.current) return
    fireOnce.current = true
    if (locked) return
    for (const s of slots) {
      if (s.live) void logKycSelfView(s.category)
    }
  }, [slots, locked])

  const handleUpload = useCallback(
    async (category: KycSlot['category'], file: File) => {
      setUploading((prev) => ({ ...prev, [category]: true }))
      setErrors((prev) => ({ ...prev, [category]: '' }))
      try {
        const fd = new globalThis.FormData()
        fd.append('file', file)
        fd.append('category', 'identity')
        fd.append('subdir', 'identity')
        fd.append('kycCategory', category)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? 'Upload failed')
        }
        router.refresh()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setErrors((prev) => ({ ...prev, [category]: msg }))
      } finally {
        setUploading((prev) => ({ ...prev, [category]: false }))
      }
    },
    [router],
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {slots.map((slot) => (
        <SlotCard
          key={slot.category}
          slot={slot}
          locked={locked}
          applicationStatus={applicationStatus}
          uploading={!!uploading[slot.category]}
          error={errors[slot.category] ?? ''}
          onUpload={(file) => handleUpload(slot.category, file)}
        />
      ))}
    </div>
  )
}

function SlotCard({
  slot,
  locked,
  applicationStatus,
  uploading,
  error,
  onUpload,
}: {
  slot: KycSlot
  locked: boolean
  applicationStatus: string
  uploading: boolean
  error: string
  onUpload: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasLive = !!slot.live
  const showThumbnail = hasLive && !locked

  function triggerPick() {
    inputRef.current?.click()
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) onUpload(f)
    // Reset so picking the same file again still fires change.
    e.target.value = ''
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{slot.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{slot.description}</p>
      </div>

      <div className="aspect-[4/3] rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden relative">
        {showThumbnail && slot.live ? (
          <>
            {slot.live.mimeType?.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.live.viewerUrl}
                alt={slot.label}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                <FileCheck2 className="size-6 text-primary" />
                <span>{slot.live.mimeType ?? 'document'}</span>
              </div>
            )}
          </>
        ) : hasLive && locked ? (
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground px-3 text-center">
            <Lock className="size-5" />
            <span className="font-semibold text-foreground">Locked — under review</span>
            <span>Thumbnail hidden until review finishes.</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <UploadIcon className="size-5" />
            <span>No file yet</span>
          </div>
        )}
      </div>

      {slot.live && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Uploaded {formatDate(slot.live.uploadedAt)}</p>
          {slot.live.fileSize && <p>{formatBytes(slot.live.fileSize)}</p>}
        </div>
      )}

      {slot.supersededCount > 0 && (
        <p className="text-xs text-muted-foreground/80 italic">
          {slot.supersededCount} previous version{slot.supersededCount === 1 ? '' : 's'} kept for audit
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="mt-auto flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={onChange}
          disabled={locked || uploading}
        />
        {locked ? (
          <button
            type="button"
            disabled
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground cursor-not-allowed"
          >
            <Lock className="size-3.5" />
            {applicationStatus === 'APPROVED' ? 'Verified — locked' : 'Locked'}
          </button>
        ) : hasLive ? (
          <button
            type="button"
            onClick={triggerPick}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 disabled:opacity-50"
          >
            <RefreshCw className="size-3.5" />
            {uploading ? 'Uploading…' : 'Replace'}
          </button>
        ) : (
          <button
            type="button"
            onClick={triggerPick}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <UploadIcon className="size-3.5" />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        )}
      </div>

      {locked && (
        <a
          href="mailto:support@noizu.direct?subject=KYC%20review%20support"
          className="text-[11px] text-muted-foreground hover:text-foreground text-center"
        >
          Need help? Contact support
        </a>
      )}
    </div>
  )
}
