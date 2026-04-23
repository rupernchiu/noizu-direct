// Client-side helper for fetching a private bucket file with an explicit
// X-Access-Reason header. The response bytes are materialized into a blob
// URL so we can render (or open in a new tab) the private image without
// ever stamping the signed URL into browser history / referer.
//
// Callers are responsible for URL.revokeObjectURL when they're done with
// the blob URL to avoid a memory leak.

export async function fetchPrivateBlobUrl(
  viewerUrl: string,
  reasonCode: string,
  reasonNote?: string,
): Promise<string> {
  const headers: Record<string, string> = {
    'X-Access-Reason': reasonCode,
  }
  if (reasonNote && reasonNote.trim()) {
    headers['X-Access-Reason-Note'] = reasonNote.trim().slice(0, 1000)
  }

  const res = await fetch(viewerUrl, {
    method: 'GET',
    headers,
    // Private files are auth-guarded; make sure the NextAuth cookie rides along.
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  })

  if (!res.ok) {
    let msg = `Access denied (${res.status})`
    try {
      const text = await res.text()
      if (text) msg = `${msg}: ${text.slice(0, 200)}`
    } catch {}
    throw new Error(msg)
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
