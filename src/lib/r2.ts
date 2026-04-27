import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ── Public R2 client (product images, avatars, banners, blog covers, …) ────
const r2 = new S3Client({
  endpoint: process.env.R2_ENDPOINT!,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? ''

// ── Private R2 client (KYC/identity, dispute-evidence, message attachments) ─
// Falls back to the same credentials/bucket as the public client when not
// configured — logs a one-shot WARN so the operator knows KYC is sharing a
// bucket with public assets.
const PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET_NAME ?? BUCKET
const hasDedicatedPrivateBucket = Boolean(process.env.R2_PRIVATE_BUCKET_NAME)

let _privateClient: S3Client | null = null
function getPrivateClient(): S3Client {
  if (_privateClient) return _privateClient
  if (hasDedicatedPrivateBucket) {
    _privateClient = new S3Client({
      endpoint: process.env.R2_PRIVATE_ENDPOINT ?? process.env.R2_ENDPOINT!,
      region: 'auto',
      credentials: {
        accessKeyId: process.env.R2_PRIVATE_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_PRIVATE_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  } else {
    if (!_fallbackWarned) {
      console.warn('[r2] Private bucket not configured; falling back to shared bucket — DO NOT use in production for KYC')
      _fallbackWarned = true
    }
    _privateClient = r2
  }
  return _privateClient
}

let _fallbackWarned = false

const r2Private = getPrivateClient()

// ── Visibility helpers ─────────────────────────────────────────────────────
export type Visibility = 'public' | 'private'

const PRIVATE_PREFIXES = [
  'private/',
  'identity/',
  'dispute-evidence/',
  'dispute_evidence/',
  'message-attachment/',
  'message_attachment/',
  'kyc/',
  'tax-cert/',
  'tax_cert/',
]

/** Infer visibility from key when caller doesn't pass it explicitly. */
export function inferVisibility(key: string): Visibility {
  return PRIVATE_PREFIXES.some(p => key.startsWith(p)) ? 'private' : 'public'
}

function clientFor(visibility: Visibility): { client: S3Client; bucket: string } {
  if (visibility === 'private') {
    return { client: getPrivateClient(), bucket: PRIVATE_BUCKET }
  }
  return { client: r2, bucket: BUCKET }
}

// ── Options type ───────────────────────────────────────────────────────────
export interface UploadOptions {
  key: string
  body: Buffer | Uint8Array
  contentType: string
  visibility?: Visibility
}

export interface SignedUrlOptions {
  visibility?: Visibility
  /** Overrides the `Content-Disposition` the presign attaches to the GET URL. */
  contentDisposition?: string
}

// ── uploadToR2 ─────────────────────────────────────────────────────────────
// Backward-compat: older call sites pass `(buffer, key, contentType)` positionally.
// New call sites may pass a single options object (preferred).
export async function uploadToR2(options: UploadOptions): Promise<string>
export async function uploadToR2(
  buffer: Buffer | Uint8Array,
  key: string,
  contentType: string,
): Promise<string>
export async function uploadToR2(
  a: UploadOptions | Buffer | Uint8Array,
  b?: string,
  c?: string,
): Promise<string> {
  let key: string
  let body: Buffer | Uint8Array
  let contentType: string
  let visibility: Visibility

  if (typeof a === 'object' && !Buffer.isBuffer(a) && !(a instanceof Uint8Array)) {
    const opts = a as UploadOptions
    key = opts.key
    body = opts.body
    contentType = opts.contentType
    visibility = opts.visibility ?? inferVisibility(key)
  } else {
    body = a as Buffer | Uint8Array
    key = b!
    contentType = c!
    visibility = inferVisibility(key)
  }

  const { client, bucket } = clientFor(visibility)
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  // Public assets resolve via R2_PUBLIC_URL; private assets must not leak a
  // direct URL — we return the key itself (callers that need a user-facing
  // URL go through /api/files).
  return visibility === 'public' ? getR2Url(key) : key
}

export async function deleteFromR2(key: string, visibility?: Visibility): Promise<void> {
  const v = visibility ?? inferVisibility(key)
  const { client, bucket } = clientFor(v)
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

export function getR2Url(key: string): string {
  return `${PUBLIC_URL}/${key}`
}

/**
 * Presign a GET for a key.
 *
 * Default expiry is 5 minutes (300s) — short-lived by design, per upload
 * pentest finding M19. Callers needing something different pass it explicitly.
 */
export async function getR2SignedUrl(
  key: string,
  expiresIn = 300,
  options: SignedUrlOptions = {},
): Promise<string> {
  const visibility = options.visibility ?? inferVisibility(key)
  const { client, bucket } = clientFor(visibility)
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(options.contentDisposition
        ? { ResponseContentDisposition: options.contentDisposition }
        : {}),
    }),
    { expiresIn },
  )
}

/**
 * Fetch the raw object bytes for a key — used by routes that stream private
 * bytes through Next instead of 307-redirecting to the signed URL.
 */
export async function getR2Object(key: string, visibility?: Visibility) {
  const v = visibility ?? inferVisibility(key)
  const { client, bucket } = clientFor(v)
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
}

export { r2, r2Private, BUCKET, PRIVATE_BUCKET }
