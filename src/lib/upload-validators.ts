/**
 * Shared upload-path validators.
 *
 * Kept separate from r2.ts so the HTTP handlers don't re-implement the
 * same regex in five places.
 */

/** Categories the generic /api/upload endpoint is allowed to write into. */
export const UPLOAD_FOLDER_ALLOWLIST = new Set<string>([
  'product-image',
  'portfolio',
  'profile-avatar',
  'profile-banner',
  'profile-logo',
  'blog-cover',
  'media',
  'library',
  'hero',
  'identity',
  'dispute-evidence',
  'message-attachment',
  'other',
])

export function isAllowedUploadFolder(folder: string): boolean {
  return UPLOAD_FOLDER_ALLOWLIST.has(folder)
}

/**
 * Enforce that a creator-supplied digitalFiles[].key lives under the caller's
 * own digital/<creatorProfileId>/ prefix. This is the C1 fix — without it a
 * creator can sell anything in R2 as a "digital file".
 */
export function isCreatorOwnedDigitalKey(key: unknown, creatorProfileId: string): key is string {
  if (typeof key !== 'string') return false
  const prefix = `digital/${creatorProfileId}/`
  if (!key.startsWith(prefix)) return false
  // Disallow traversal and absolute paths within the key, even though R2
  // treats keys as opaque — we never want `digital/<id>/../` to reach the
  // signer.
  if (key.includes('..')) return false
  return true
}

/** Is this a well-formed /api/files/identity/<userId>/... URL for `userId`? */
export function isOwnIdentityUrl(url: unknown, userId: string): url is string {
  if (typeof url !== 'string') return false
  // Accept either the stored R2 key (`private/identity/<userId>/...`) or the
  // viewer URL (`/api/files/identity/<userId>/...`). Reject query strings.
  const clean = url.split('?')[0]
  const viewerRe = new RegExp(`^/api/files/identity/${escapeRegExp(userId)}/[A-Za-z0-9._-]+$`)
  const r2KeyRe = new RegExp(`^private/identity/${escapeRegExp(userId)}/[A-Za-z0-9._-]+$`)
  return viewerRe.test(clean) || r2KeyRe.test(clean)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
