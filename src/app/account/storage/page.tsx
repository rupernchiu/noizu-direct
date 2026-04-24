import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const STORAGE_LIMIT_BYTES = 100 * 1024 * 1024 // 100 MB

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date))
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

type Attachment = {
  url: string
  type: string
  name: string
  size: number
}

type FileEntry = {
  attachmentId: string
  ticketId: string
  createdAt: Date
  attachment: Attachment
}

function fileNameFromR2Key(r2Key: string): string {
  const tail = r2Key.split('/').pop()
  return tail && tail.length > 0 ? tail : r2Key
}

export default async function StoragePage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const attachments = await prisma.ticketAttachment.findMany({
    where: { uploaderId: userId, supersededAt: null },
    select: {
      id: true,
      ticketId: true,
      createdAt: true,
      viewerUrl: true,
      r2Key: true,
      mimeType: true,
      fileSize: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const files: FileEntry[] = attachments.map(a => ({
    attachmentId: a.id,
    ticketId: a.ticketId,
    createdAt: a.createdAt,
    attachment: {
      url: a.viewerUrl,
      type: a.mimeType ?? 'unknown',
      name: fileNameFromR2Key(a.r2Key),
      size: a.fileSize ?? 0,
    },
  }))

  const totalBytes = files.reduce((sum, f) => sum + f.attachment.size, 0)
  const imageFiles = files.filter(f => f.attachment.type?.startsWith('image/') || f.attachment.type === 'image')
  const pdfFiles = files.filter(f => f.attachment.type?.includes('pdf'))
  const otherFiles = files.filter(
    f => !f.attachment.type?.startsWith('image/') && f.attachment.type !== 'image' && !f.attachment.type?.includes('pdf')
  )

  const imageBytesTotal = imageFiles.reduce((sum, f) => sum + f.attachment.size, 0)
  const pdfBytesTotal = pdfFiles.reduce((sum, f) => sum + f.attachment.size, 0)
  const otherBytesTotal = otherFiles.reduce((sum, f) => sum + f.attachment.size, 0)

  const pct = Math.min((totalBytes / STORAGE_LIMIT_BYTES) * 100, 100)
  const isWarning = pct > 80

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Storage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your ticket attachment storage
        </p>
      </div>

      {/* Storage usage card */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Storage Used</h2>
          <span className="text-sm font-medium text-foreground">
            {formatBytes(totalBytes)} of {formatBytes(STORAGE_LIMIT_BYTES)}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="rounded-full overflow-hidden"
          style={{ height: '8px', background: 'var(--border)' }}
        >
          <div
            style={{
              width: `${Math.min(pct, 100)}%`,
              height: '8px',
              background: isWarning ? '#f97316' : '#7c3aed',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {pct.toFixed(1)}% used
          </span>
          <span className="text-xs text-muted-foreground">
            {formatBytes(STORAGE_LIMIT_BYTES - totalBytes)} remaining
          </span>
        </div>

        {isWarning && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <svg className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-orange-400">
              You&apos;re using over 80% of your storage. Consider asking creators to close old tickets
              to free up space.
            </p>
          </div>
        )}
      </div>

      {/* Breakdown */}
      {files.length > 0 && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Breakdown by Type</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Files</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {imageFiles.length > 0 && (
                <tr>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-foreground">Images</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{imageFiles.length}</td>
                  <td className="px-6 py-3 text-right text-foreground font-medium">{formatBytes(imageBytesTotal)}</td>
                </tr>
              )}
              {pdfFiles.length > 0 && (
                <tr>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-foreground">PDFs</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{pdfFiles.length}</td>
                  <td className="px-6 py-3 text-right text-foreground font-medium">{formatBytes(pdfBytesTotal)}</td>
                </tr>
              )}
              {otherFiles.length > 0 && (
                <tr>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                      <span className="text-foreground">Other</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{otherFiles.length}</td>
                  <td className="px-6 py-3 text-right text-foreground font-medium">{formatBytes(otherBytesTotal)}</td>
                </tr>
              )}
              <tr className="bg-background/50">
                <td className="px-6 py-3">
                  <span className="text-foreground font-semibold">Total</span>
                </td>
                <td className="px-6 py-3 text-right text-foreground font-semibold">{files.length}</td>
                <td className="px-6 py-3 text-right text-foreground font-bold">{formatBytes(totalBytes)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <svg
            className="w-10 h-10 text-muted-foreground mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
            />
          </svg>
          <p className="text-foreground font-semibold">No attachments yet</p>
          <p className="text-muted-foreground text-sm mt-1">0 MB of 100 MB used</p>

          {/* Zero bar */}
          <div
            className="mx-auto mt-4 rounded-full overflow-hidden"
            style={{ height: '8px', background: 'var(--border)', maxWidth: '240px' }}
          >
            <div style={{ width: '0%', height: '8px', background: '#7c3aed', borderRadius: '4px' }} />
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Files ({files.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">File</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Type</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Size</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {files.map((file, idx) => {
                const isImage =
                  file.attachment.type?.startsWith('image/') || file.attachment.type === 'image'
                const isPdf = file.attachment.type?.includes('pdf')

                return (
                  <tr key={idx} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.attachment.url}
                            alt={file.attachment.name}
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-background flex items-center justify-center flex-shrink-0">
                            {isPdf ? (
                              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                        )}
                        <span className="text-foreground truncate max-w-[160px]">
                          {file.attachment.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground hidden sm:table-cell">
                      <span className="text-xs bg-background border border-border rounded px-1.5 py-0.5">
                        {file.attachment.type || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground whitespace-nowrap">
                      {formatBytes(file.attachment.size)}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/account/tickets/${file.ticketId}`}
                        className="text-primary hover:underline text-xs"
                      >
                        View ticket
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info note */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Note:</span> Storage is used for ticket
          attachments only. Downloads and purchased digital files do not count toward your storage
          limit.
        </p>
      </div>
    </div>
  )
}
