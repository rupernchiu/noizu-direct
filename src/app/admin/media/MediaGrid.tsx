'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CopyUrlButton } from './CopyUrlButton'

interface MediaItem {
  id: string
  filename: string
  url: string
  fileSize: number | null
  width: number | null
  height: number | null
  mimeType: string | null
  createdAt: string
  uploader: { name: string }
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'])

function getExt(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

function isImage(filename: string) {
  return IMAGE_EXTS.has(getExt(filename))
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

interface MediaDetailModalProps {
  item: MediaItem
  onClose: () => void
  onDelete: (id: string) => void
}

function MediaDetailModal({ item, onClose, onDelete }: MediaDetailModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/media/${item.id}`, { method: 'DELETE' })
      if (res.ok) {
        onClose()
        onDelete(item.id)
        router.refresh()
      }
    } finally {
      setDeleting(false)
    }
  }

  const ext = getExt(item.filename).toUpperCase() || 'FILE'
  const formatLabel = item.mimeType
    ? item.mimeType.split('/')[1]?.toUpperCase() ?? ext
    : ext

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="bg-surface border-border text-foreground sm:max-w-2xl w-full p-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="flex flex-col md:flex-row">
          {/* Preview */}
          <div className="md:w-72 shrink-0 bg-background flex items-center justify-center min-h-48">
            {isImage(item.filename) ? (
              <div className="relative w-full aspect-square">
                <Image
                  src={item.url}
                  alt={item.filename}
                  fill
                  className="object-contain p-2"
                  unoptimized={item.url.startsWith('/uploads/')}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm uppercase">{ext}</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 p-5 space-y-4 min-w-0">
            <DialogHeader>
              <DialogTitle className="text-foreground text-base font-semibold break-all">
                {item.filename}
              </DialogTitle>
            </DialogHeader>

            <dl className="space-y-2 text-sm">
              {item.fileSize != null && (
                <div className="flex gap-3">
                  <dt className="text-muted-foreground shrink-0 w-24">Size</dt>
                  <dd className="text-foreground">{formatBytes(item.fileSize)}</dd>
                </div>
              )}
              <div className="flex gap-3">
                <dt className="text-muted-foreground shrink-0 w-24">Dimensions</dt>
                <dd className="text-foreground">
                  {item.width != null && item.height != null
                    ? `${item.width} × ${item.height} px`
                    : 'Unknown'}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-muted-foreground shrink-0 w-24">Format</dt>
                <dd className="text-foreground">{formatLabel}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-muted-foreground shrink-0 w-24">Uploaded</dt>
                <dd className="text-foreground">{formatDateTime(item.createdAt)}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-muted-foreground shrink-0 w-24">Uploaded by</dt>
                <dd className="text-foreground">{item.uploader.name}</dd>
              </div>
              <div className="flex gap-3 items-start">
                <dt className="text-muted-foreground shrink-0 w-24">URL</dt>
                <dd className="text-foreground break-all text-xs font-mono bg-background rounded px-2 py-1 flex-1">
                  {item.url}
                </dd>
              </div>
            </dl>

            <div className="flex gap-2 flex-wrap pt-1">
              <CopyUrlButton url={item.url} />
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                  confirmDelete
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                }`}
              >
                {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete' : 'Delete'}
              </button>
              {confirmDelete && !deleting && (
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:bg-card transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={onClose}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:bg-card transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface MediaGridProps {
  items: MediaItem[]
}

export function MediaGrid({ items }: MediaGridProps) {
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const visible = items.filter((i) => !deletedIds.has(i.id))

  if (visible.length === 0) {
    return null // let server page render its own empty state
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {visible.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item)}
            suppressHydrationWarning
            className="bg-card rounded-xl border border-border overflow-hidden group text-left hover:border-primary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Thumbnail */}
            <div className="aspect-square bg-background flex items-center justify-center relative">
              {isImage(item.filename) ? (
                <Image
                  src={item.url}
                  alt={item.filename}
                  fill
                  className="object-cover"
                  sizes="200px"
                  unoptimized={item.url.startsWith('/uploads/')}
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs uppercase">{getExt(item.filename)}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-2 space-y-0.5">
              <p className="text-foreground text-xs font-medium truncate" title={item.filename}>
                {item.filename}
              </p>
              <p className="text-muted-foreground text-xs">{item.uploader.name}</p>
              {item.fileSize != null && (
                <p className="text-muted-foreground text-xs">{formatBytes(item.fileSize)}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <MediaDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => {
            setDeletedIds((prev) => new Set([...prev, id]))
            setSelected(null)
          }}
        />
      )}
    </>
  )
}
