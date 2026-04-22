import crypto from 'crypto'

// AES-256-GCM with per-record 12-byte IV and 16-byte auth tag.
// Envelope format: "v2:<iv-hex>:<tag-hex>:<ciphertext-hex>"
// Legacy (unauthenticated) envelope "<iv-hex>:<ciphertext-hex>" is still
// decryptable so pre-migration rows keep working until re-encrypted on next write.

const V2_PREFIX = 'v2:'

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.PAYOUT_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'PAYOUT_ENCRYPTION_KEY is not set. Set a base64-encoded 32-byte key in the environment.'
    )
  }
  let key: Buffer
  try {
    key = Buffer.from(raw, 'base64')
  } catch {
    throw new Error('PAYOUT_ENCRYPTION_KEY must be base64-encoded')
  }
  // Back-compat: if the env var is exactly 32 ASCII chars (legacy configuration),
  // treat it as the raw key. This lets existing deployments roll forward without
  // an immediate env swap, while still failing loudly if the value is missing.
  if (key.length !== 32) {
    if (raw.length === 32) {
      key = Buffer.from(raw, 'utf8')
    } else {
      throw new Error(
        `PAYOUT_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Generate via: openssl rand -base64 32`
      )
    }
  }
  cachedKey = key
  return key
}

export function encryptPayoutDetails(plaintext: string, aad?: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'))
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${V2_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decryptPayoutDetails(envelope: string, aad?: string): string {
  const key = getKey()
  if (envelope.startsWith(V2_PREFIX)) {
    const [, ivHex, tagHex, encHex] = envelope.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const enc = Buffer.from(encHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'))
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  }
  // Legacy CBC read-path (no MAC). Pre-migration rows only.
  const [ivHex, encHex] = envelope.split(':')
  if (!ivHex || !encHex) throw new Error('Malformed payout envelope')
  const iv = Buffer.from(ivHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

export function tryDecryptPayoutDetails(envelope: string, aad?: string): string {
  try {
    return decryptPayoutDetails(envelope, aad)
  } catch {
    return ''
  }
}
