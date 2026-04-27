import { promises as fs } from 'node:fs'
import path from 'node:path'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { COUNTRIES, enabledCreatorCountries } from '@/lib/countries'
import { TaxOnboardingForm } from './TaxOnboardingForm'

// Phase 3 of the tax architecture build. Server wrapper that:
//  1. Auth-gates to CREATOR role (the existing dashboard layout already does
//     this, but this page must also bail back to /dashboard if onboarding is
//     already done — so we look the profile up directly).
//  2. Detects geo via x-vercel-ip-country (fallback MY).
//  3. Loads + sanitizes the indemnification copy.
//  4. Builds the country option lists for the form.

const TOS_FILE = path.join(process.cwd(), 'src', 'content', 'legal', 'tax-indemnification.md')

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  if (!raw.startsWith('---')) return { meta: {}, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { meta: {}, body: raw }
  const fmBlock = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).replace(/^\r?\n/, '')
  const meta: Record<string, string> = {}
  for (const line of fmBlock.split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) meta[key] = val
  }
  return { meta, body }
}

async function loadIndemnification(): Promise<{ html: string; version: string }> {
  const raw = await fs.readFile(TOS_FILE, 'utf-8')
  const { meta, body } = parseFrontmatter(raw)
  const dirty = await marked.parse(body)
  const html = sanitizeHtml(dirty, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'mark']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })
  return { html, version: meta.version ?? 'unknown' }
}

export default async function TaxOnboardingPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const role = (session.user as any).role as string | undefined
  if (role !== 'CREATOR') redirect('/')

  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: {
      creatorClassification: true,
      taxId: true,
      taxJurisdiction: true,
      payoutCountry: true,
      taxOnboardingAcknowledgedAt: true,
    },
  })

  if (!profile) redirect('/dashboard')
  if (profile.taxOnboardingAcknowledgedAt) redirect('/dashboard')

  const hdrs = await headers()
  const geoHeader = (hdrs.get('x-vercel-ip-country') ?? hdrs.get('cf-ipcountry') ?? '').toUpperCase()
  // Fall back to MY if the header is missing OR the detected country isn't a
  // creator-enabled one (otherwise the form would default to a disabled value).
  const enabled = enabledCreatorCountries()
  const enabledIso = new Set(enabled.map((c) => c.iso2))
  const detected =
    enabledIso.has(geoHeader) ? geoHeader : profile.payoutCountry && enabledIso.has(profile.payoutCountry)
      ? profile.payoutCountry
      : 'MY'

  const { html, version } = await loadIndemnification()

  const enabledCountries = enabled
    .map((c) => ({ iso2: c.iso2, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const allCountries = Object.values(COUNTRIES)
    .map((c) => ({ iso2: c.iso2, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Onboarding</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">Tax qualification</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">
          Tell us where you&apos;re based and whether you operate as an individual or a registered
          business. This information drives how we report your earnings and ensures the right
          treatment at payout time. You can update it later from your profile settings.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <TaxOnboardingForm
          defaultCountry={detected}
          enabledCountries={enabledCountries}
          allCountries={allCountries}
          existingValues={{
            country: profile.payoutCountry,
            classification:
              (profile.creatorClassification as 'INDIVIDUAL' | 'REGISTERED_BUSINESS' | null) ?? null,
            taxId: profile.taxId,
            taxJurisdiction: profile.taxJurisdiction,
          }}
          indemnificationHtml={html}
          indemnificationVersion={version}
        />
      </div>
    </div>
  )
}
