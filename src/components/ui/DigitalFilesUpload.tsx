'use client'
import { useState, useRef } from 'react'
import { X, UploadCloud, FileArchive, Loader2 } from 'lucide-react'

export interface DigitalFile {
  key: string
  filename: string
  size: number
  mime: string
}

interface Props {
  files: DigitalFile[]
  onChange: (files: DigitalFile[]) => void
  maxFiles?: number
  disabled?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function DigitalFilesUpload({ files, onChange, maxFiles = 10, disabled }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(fileList: FileList) {
    setError(null)
    if (files.length + fileList.length > maxFiles) {
      setError(`Max ${maxFiles} files`)
      return
    }
    setUploading(true)
    try {
      const uploaded: DigitalFile[] = []
      for (const f of Array.from(fileList)) {
        const fd = new FormData()
        fd.append('file', f)
        const res = await fetch('/api/upload/digital', { method: 'POST', body: fd })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          setError(body.error ?? `Failed to upload ${f.name}`)
          break
        }
        const df = await res.json() as DigitalFile
        uploaded.push(df)
      }
      if (uploaded.length > 0) onChange([...files, ...uploaded])
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx))
  }

  const atMax = files.length >= maxFiles

  return (
    <div className="space-y-3">
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li
              key={f.key}
              className="flex items-center gap-3 rounded-lg bg-card border border-border px-3 py-2"
            >
              <FileArchive className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{f.filename}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                disabled={disabled || uploading}
                className="text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label="Remove file"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!atMax && (
        <label
          className={`flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors ${
            disabled || uploading
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:border-primary hover:text-foreground'
          }`}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          <span>
            {uploading ? 'Uploading…' : `Upload file${files.length === 0 ? '' : ' (add more)'}`}
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            disabled={disabled || uploading}
            onChange={e => e.target.files && handleFiles(e.target.files)}
            accept=".zip,.rar,.7z,.tar,.gz,.pdf,.psd,.ai,.eps,.mp3,.wav,.flac,.mp4,.mov,.epub"
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Max 200MB per file. Accepted: zip, rar, 7z, pdf, psd, audio, video, epub.
      </p>
    </div>
  )
}
