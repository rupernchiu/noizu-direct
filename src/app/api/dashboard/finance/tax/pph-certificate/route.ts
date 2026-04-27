/**
 * GET /api/dashboard/finance/tax/pph-certificate?year=YYYY
 *
 * Annual PPh Final 0.5% withholding certificate — Indonesia only.
 *
 * Pre-conditions:
 *   - Creator's payout/jurisdiction country is ID. Otherwise 404.
 *   - At least one withheld order exists in the requested year. Otherwise 404
 *     ("No withholding for {year}").
 *
 * Returns: application/pdf attachment.
 */
import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import { requireCreatorProfile, unauthorized, notFound } from '@/lib/guards'
import { computePphCertificate } from '@/lib/tax-statement'
import { PPhCertificate } from '@/lib/pdf/PPhCertificate'

const yearSchema = z.coerce.number().int().min(2000).max(3000)

export async function GET(req: NextRequest) {
  const ctx = await requireCreatorProfile()
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const yearParam = url.searchParams.get('year')
  const yearParsed = yearSchema.safeParse(yearParam ?? new Date().getUTCFullYear())
  if (!yearParsed.success) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }
  const year = yearParsed.data

  const data = await computePphCertificate(ctx.userId, ctx.profile, year)
  if (!data) {
    // Either creator is non-ID or no withholding in that year — both surface as 404.
    const country = (ctx.profile.payoutCountry ?? ctx.profile.taxJurisdiction ?? '').toUpperCase()
    if (country !== 'ID') {
      return notFound('PPh certificate is only available for Indonesia-based creators.')
    }
    return notFound(`No withholding for ${year}`)
  }

  const generatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
  const buffer = await (renderToBuffer as any)(
    React.createElement(PPhCertificate, { data, generatedAt }),
  )

  const safeName = (data.creator.legalFullName ?? data.creator.name ?? 'creator')
    .replace(/[^a-z0-9-]/gi, '_')
    .slice(0, 60) || 'creator'
  const filename = `pph-certificate-${safeName}-${year}.pdf`

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
