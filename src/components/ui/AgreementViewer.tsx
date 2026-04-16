'use client'

interface Props {
  content: string
  title: string
  version: string
  effectiveDate: string
  maxHeight?: string
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(iso))
}

export function AgreementViewer({ content, title, version, effectiveDate, maxHeight = '32rem' }: Props) {
  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title} v${version}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #666; margin-bottom: 32px; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.7; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Version ${version} &mdash; Effective ${formatDate(effectiveDate)}</div>
  <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground leading-tight">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mr-2">
              v{version}
            </span>
            Effective {formatDate(effectiveDate)}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          title="Print agreement"
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17H7v4H2v-9h20v9h-5v-4zM7 3h10v6H7V3z" />
          </svg>
          Print
        </button>
      </div>

      {/* Scrollable content */}
      <div
        className="overflow-y-auto px-5 py-4"
        style={{ maxHeight }}
      >
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  )
}
