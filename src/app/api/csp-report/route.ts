import { NextRequest, NextResponse } from 'next/server'

// M23 — CSP violation sink. Modern browsers POST violation reports here as
// either `application/csp-report` (older format, a single report envelope)
// or `application/reports+json` (newer Reporting API, an array of
// reports). We accept both and log at warn level so operators see:
//   - regressions that add un-nonced <script> tags,
//   - CMS authors who paste in a `javascript:` href that got past the
//     H17 client-side guard,
//   - unexpected third-party network calls that breach connect-src.
//
// We deliberately do NOT echo anything back to the caller beyond 204. No
// authentication either — reports come from the user's browser and are
// best-effort. If abuse volume ever becomes a problem we can gate with
// rate-limit on clientIp here.

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? ''

    if (
      contentType.includes('application/csp-report') ||
      contentType.includes('application/reports+json') ||
      contentType.includes('application/json')
    ) {
      const body = await req.json().catch(() => null)
      if (body) {
        // Trim to what's useful; the raw payload can be large and noisy.
        console.warn('[csp-violation]', typeof body === 'string' ? body : JSON.stringify(body).slice(0, 4000))
      }
    } else {
      // Some browsers still send with no content-type; read as text.
      const text = await req.text().catch(() => '')
      if (text) console.warn('[csp-violation]', text.slice(0, 4000))
    }
  } catch (err) {
    console.error('[csp-report] failed to process report', err)
  }

  // 204 No Content — the spec allows any 2xx; this avoids cache weirdness.
  return new NextResponse(null, { status: 204 })
}
