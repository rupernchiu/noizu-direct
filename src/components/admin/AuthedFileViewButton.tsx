'use client'

import { useEffect, useState } from 'react'
import { AccessReasonModal } from './AccessReasonModal'
import { fetchPrivateBlobUrl } from '@/lib/private-file-fetch'
import type { AccessReasonCode } from '@/lib/private-file-audit'

interface Props {
  /** Path to the authenticated stream endpoint, e.g. /api/files/dispute-evidence/… */
  src: string
  /** Button label. Defaults to "View". */
  label?: string
  defaultReason?: AccessReasonCode
  title?: string
  resourceLabel?: string
}

/**
 * Small viewer that prompts for an access reason, then streams the file
 * bytes with X-Access-Reason headers attached so the backend can write a
 * PrivateFileAccess row. Uses a blob URL so the signed bytes never hit a
 * naked <img> request (which couldn't set headers).
 */
export function AuthedFileViewButton({
  src,
  label = 'View',
  defaultReason = 'DISPUTE_REVIEW',
  title = 'Confirm access reason',
  resourceLabel,
}: Props) {
  const [showModal, setShowModal] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  async function handleConfirm(reasonCode: AccessReasonCode, reasonNote: string) {
    setLoading(true)
    setError('')
    try {
      const url = await fetchPrivateBlobUrl(src, reasonCode, reasonNote)
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      setBlobUrl(url)
      setShowModal(false)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError((err as Error).message || 'Network error')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setShowModal(true); setError('') }}
        disabled={loading}
        className="px-2 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
      >
        {loading ? 'Loading…' : label}
      </button>
      {error && <span className="ml-2 text-[11px] text-red-400">{error}</span>}
      <AccessReasonModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        defaultReasonCode={defaultReason}
        title={title}
        resourceLabel={resourceLabel}
        submitLabel="View file"
      />
    </>
  )
}
