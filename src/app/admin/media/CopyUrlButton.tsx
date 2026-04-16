'use client'

import { useState } from 'react'

export function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for non-secure contexts
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={copy}
      className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
    >
      {copied ? 'Copied!' : 'Copy URL'}
    </button>
  )
}
