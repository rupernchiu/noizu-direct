'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml'
const MAX_SIZE_MB = 10

export function MediaUploadZone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    if (arr.length === 0) return

    const oversized = arr.filter((f) => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (oversized.length > 0) {
      setErrors(oversized.map((f) => `${f.name} exceeds ${MAX_SIZE_MB}MB limit`))
      return
    }

    setUploading(true)
    setErrors([])
    const done: string[] = []
    const errs: string[] = []

    for (const file of arr) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('subdir', 'library')

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!res.ok) throw new Error('Upload failed')
        const data = await res.json() as {
          url: string
          filename: string
          mimeType: string | null
          fileSize: number | null
          width: number | null
          height: number | null
        }

        // Register in Media table
        await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: data.url,
            filename: data.filename,
            mimeType: data.mimeType,
            fileSize: data.fileSize,
            width: data.width,
            height: data.height,
          }),
        })

        done.push(file.name)
      } catch {
        errs.push(`Failed to upload ${file.name}`)
      }
    }

    setProgress(done)
    setErrors(errs)
    setUploading(false)
    router.refresh()
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      uploadFiles(e.dataTransfer.files)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
          dragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:border-primary/60 hover:bg-primary/5'
        }`}
      >
        <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {uploading ? 'Uploading…' : 'Drop files here or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, WebP, SVG · Max {MAX_SIZE_MB}MB each</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="sr-only"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {progress.length > 0 && (
        <p className="text-xs text-green-400">
          Uploaded: {progress.join(', ')}
        </p>
      )}
      {errors.length > 0 && (
        <ul className="space-y-0.5">
          {errors.map((err, i) => (
            <li key={i} className="text-xs text-red-400">{err}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
