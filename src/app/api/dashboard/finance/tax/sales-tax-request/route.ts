/**
 * POST /api/dashboard/finance/tax/sales-tax-request
 *
 * Two modes (multipart/form-data):
 *
 *   Mode 1 — submit / re-submit a sales-tax collection request:
 *     fields: rate (decimal 0<r<0.25), label (SST|GST|VAT|PPN), certificate (file)
 *     Effect: salesTaxStatus → REQUESTED, persists rate/label, uploads cert.
 *             Does NOT flip collectsSalesTax — admin approval does.
 *
 *   Mode 2 — toggle collection on an already-APPROVED creator:
 *     fields: toggleCollect = 'on' | 'off'
 *     Effect: collectsSalesTax = (on→true|off→false). Status stays APPROVED.
 *             Re-enabling does not require re-approval.
 *
 * Pre-conditions for Mode 1:
 *   - creatorClassification === 'REGISTERED_BUSINESS'
 *   - taxId AND taxJurisdiction populated (Phase 3 onboarding complete)
 *
 * Auth: requireCreatorProfile() (CREATOR role + CreatorProfile exists).
 */
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { extname } from 'path'
import { requireCreatorProfile } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { uploadToR2 } from '@/lib/r2'
import { sniffFirstBytes } from '@/lib/file-sniff'

const MAX_CERT_BYTES = 5 * 1024 * 1024
const ALLOWED_CERT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const MAGIC_ALLOW = new Set(['pdf', 'png', 'jpg', 'webp'])
const ALLOWED_LABELS = new Set(['SST', 'GST', 'VAT', 'PPN'])

export async function POST(req: Request) {
  const auth = await requireCreatorProfile()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { userId, profile } = auth

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  // ── Mode 2 — toggle collection ──────────────────────────────────────────────
  const toggle = formData.get('toggleCollect')
  if (typeof toggle === 'string') {
    if (toggle !== 'on' && toggle !== 'off') {
      return NextResponse.json({ error: 'toggleCollect must be on|off' }, { status: 400 })
    }
    if (profile.salesTaxStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'You can only toggle collection once your request is approved.' },
        { status: 400 },
      )
    }
    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: { collectsSalesTax: toggle === 'on' },
    })
    return NextResponse.json({ ok: true })
  }

  // ── Mode 1 — submit / re-submit request ────────────────────────────────────

  // Pre-conditions.
  if (profile.creatorClassification !== 'REGISTERED_BUSINESS') {
    return NextResponse.json(
      {
        error:
          'Sales-tax collection is only available for registered businesses. Update your tax classification in onboarding first.',
      },
      { status: 400 },
    )
  }
  if (!profile.taxId || !profile.taxJurisdiction) {
    return NextResponse.json(
      { error: 'Complete tax onboarding (tax ID + jurisdiction) before requesting sales-tax collection.' },
      { status: 400 },
    )
  }
  if (profile.salesTaxStatus === 'APPROVED') {
    // Already approved — they should toggle, not re-request. Block to keep the
    // state machine clean; admins handle changes manually.
    return NextResponse.json(
      { error: 'Your sales-tax request is already approved. Contact admin to change rate/label/certificate.' },
      { status: 400 },
    )
  }

  // Validate fields.
  const rateRaw = formData.get('rate')
  const labelRaw = formData.get('label')
  const file = formData.get('certificate') as File | null

  const rate = typeof rateRaw === 'string' ? parseFloat(rateRaw) : NaN
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 0.25) {
    return NextResponse.json(
      { error: 'Rate must be a decimal between 0 and 0.25 (i.e. 0%–25%).' },
      { status: 400 },
    )
  }

  const label = typeof labelRaw === 'string' ? labelRaw.toUpperCase() : ''
  if (!ALLOWED_LABELS.has(label)) {
    return NextResponse.json(
      { error: 'Label must be one of SST, GST, VAT, PPN.' },
      { status: 400 },
    )
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Certificate file is required.' }, { status: 400 })
  }
  if (!ALLOWED_CERT_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Certificate must be a PDF, JPG, or PNG.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_CERT_BYTES) {
    return NextResponse.json({ error: 'Certificate must be 5 MB or smaller.' }, { status: 413 })
  }

  // Magic-byte sniff: trust the bytes, not the declared MIME.
  const buf = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffFirstBytes(buf)
  if (!sniffed || !MAGIC_ALLOW.has(sniffed)) {
    console.warn('[sales-tax-request] magic-byte mismatch on certificate', {
      userId,
      claimedType: file.type,
      sniffed,
    })
    return NextResponse.json(
      { error: 'File bytes do not match the declared type.' },
      { status: 400 },
    )
  }

  // Upload to R2 under private/tax-cert/<userId>/<uuid>.<ext>. The /api/files
  // route grants owner self-view via the userId path segment.
  const ext = (extname(file.name).slice(1) || (file.type === 'application/pdf' ? 'pdf' : 'jpg'))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 4)
  const filename = `${uuidv4()}.${ext || 'bin'}`
  const r2Key = `private/tax-cert/${userId}/${filename}`
  const viewerUrl = `/api/files/tax-cert/${userId}/${filename}`

  try {
    await uploadToR2({ key: r2Key, body: buf, contentType: file.type, visibility: 'private' })
  } catch (err) {
    console.error('[sales-tax-request] R2 upload failed', {
      userId,
      err: (err as Error).message,
    })
    return NextResponse.json(
      { error: 'Could not store certificate. Please try again.' },
      { status: 500 },
    )
  }

  // Persist. Note: we do NOT set collectsSalesTax — admin flips that on
  // approval. Status moves NONE/REJECTED → REQUESTED. If already REQUESTED
  // (re-submit), stay REQUESTED with updated values.
  await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: {
      salesTaxStatus: 'REQUESTED',
      salesTaxRate: rate,
      salesTaxLabel: label,
      salesTaxCertificateUrl: viewerUrl,
      // If they're re-requesting after rejection, clear approval metadata.
      salesTaxApprovedAt: null,
      salesTaxApprovedBy: null,
      collectsSalesTax: false,
    },
  })

  return NextResponse.json({ ok: true })
}
