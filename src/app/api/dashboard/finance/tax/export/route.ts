/**
 * GET /api/dashboard/finance/tax/export
 *
 * Renders the creator's tax & earnings statement to a single-page PDF using
 * the same aggregation as the JSON endpoint.
 *
 * Auth: creator only.
 */
import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { requireCreatorProfile, unauthorized } from '@/lib/guards'
import { computeTaxStatement, parseTaxStatementParams, resolvePeriod } from '@/lib/tax-statement'
import { CreatorTaxStatement } from '@/lib/pdf/CreatorTaxStatement'

export async function GET(req: NextRequest) {
  const ctx = await requireCreatorProfile()
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const parsed = parseTaxStatementParams(url.searchParams)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const data = await computeTaxStatement(ctx.userId, ctx.profile, parsed.data)
  const period = resolvePeriod(parsed.data)

  const generatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
  const buffer = await (renderToBuffer as any)(
    React.createElement(CreatorTaxStatement, { data, generatedAt }),
  )

  // Filename — month-precision when period is a single calendar month.
  let filename = 'tax-statement.pdf'
  if (period.isMonth && period.year && period.month) {
    filename = `tax-statement-${period.year}-${String(period.month).padStart(2, '0')}.pdf`
  } else if (period.isYear && period.year) {
    filename = `tax-statement-${period.year}.pdf`
  } else {
    const f = period.from.toISOString().slice(0, 10)
    const t = new Date(period.to.getTime() - 1).toISOString().slice(0, 10)
    filename = `tax-statement-${f}-to-${t}.pdf`
  }

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
