// URL-safety helpers for user/CMS-controlled hrefs.
//
// H17 — attackers can poison third-party-bound URLs ("creator social link",
// "CMS announcement link", "popup CTA") with `javascript:` / `data:` / bare
// schemes which navigate the top frame and bypass CSP's script-src. These
// helpers reject anything that isn't an absolute http(s) URL (external) or a
// same-origin absolute path (internal). When the input is unsafe, callers
// should render a non-link fallback — NEVER `href="#"`, which is still
// clickable and may interfere with SPA routing.

export function safeExternalHref(u: string | null | undefined): string | null {
  if (!u || typeof u !== 'string') return null
  const trimmed = u.trim()
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) return null
  return trimmed
}

export function safeInternalHref(u: string | null | undefined): string | null {
  if (!u || typeof u !== 'string') return null
  const trimmed = u.trim()
  if (!trimmed) return null
  // Allow same-origin absolute paths only. Reject protocol-relative `//evil`
  // and any scheme (including `javascript:`, `data:`, `mailto:`, `tel:`).
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  return null
}
