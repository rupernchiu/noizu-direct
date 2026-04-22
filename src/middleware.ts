import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const isDev = process.env.NODE_ENV !== 'production'

// Per-request CSP with a nonce + strict-dynamic. The bootstrap script Next
// emits carries the nonce; strict-dynamic then trusts anything those scripts
// load transitively (Vercel Analytics/SpeedInsights, Microsoft Clarity), so
// we no longer need the host-source allow-list we shipped before.
function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // style-src: Next emits inline critical CSS for App Router. In prod we
    // cover it with the nonce; in dev React Refresh also injects inline
    // styles, so 'unsafe-inline' stays on the dev path only.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`} https://fonts.googleapis.com`,
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' blob: data: https://*.r2.dev https://*.r2.cloudflarestorage.com https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://i.ytimg.com https://img.youtube.com",
    "media-src 'self' blob: data: https://*.r2.dev https://*.r2.cloudflarestorage.com https://www.w3schools.com",
    "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://www.clarity.ms https://c.clarity.ms",
    "frame-ancestors 'self'",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ]
  return directives.join('; ')
}

// Nonce CSP only attaches to responses that actually render HTML. API routes
// return JSON and don't need a script-src policy; image/static assets are
// excluded from the middleware matcher.
function shouldAttachCsp(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return false
  if (pathname.startsWith('/_next/')) return false
  if (pathname.startsWith('/uploads/')) return false
  return true
}

// Hotlink allowlist. Dev on localhost, prod on canonical domain. Referer host
// is matched case-insensitively; trailing-slash stripped by URL parser.
function allowedReferHosts(): Set<string> {
  const hosts = new Set<string>(['localhost:7000', '127.0.0.1:7000'])
  const canonical = process.env.NEXT_PUBLIC_CANONICAL_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (canonical) hosts.add(canonical)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (appUrl) hosts.add(appUrl)
  return hosts
}

// Paths that bypass maintenance mode — admin must always be accessible to turn it off
const MAINTENANCE_BYPASS = [
  '/maintenance',
  '/admin',
  '/api/',
  '/_next',
  '/favicon',
  '/uploads',
  '/fonts',
  '/images',
  '/icons',
]

// Upstash REST client is edge-compatible. Only construct once per isolate.
let redis: Redis | null = null
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

// Per-isolate memo so we don't hit Redis on every request. 30s is short enough
// that flipping maintenance in the admin UI propagates quickly, long enough to
// absorb traffic bursts.
type MaintenanceCache = { enabled: boolean; checkedAt: number }
let maintenanceCache: MaintenanceCache | null = null
const MAINTENANCE_TTL_MS = 30_000

async function isMaintenanceEnabled(): Promise<boolean> {
  const now = Date.now()
  if (maintenanceCache && now - maintenanceCache.checkedAt < MAINTENANCE_TTL_MS) {
    return maintenanceCache.enabled
  }
  const client = getRedis()
  if (!client) {
    // No Redis — err on the side of letting traffic through; a broken
    // maintenance flag shouldn't take down the site.
    maintenanceCache = { enabled: false, checkedAt: now }
    return false
  }
  try {
    const flag = await client.get<string | boolean>('platform:maintenance')
    const enabled = flag === true || flag === 'true' || flag === '1'
    maintenanceCache = { enabled, checkedAt: now }
    return enabled
  } catch {
    maintenanceCache = { enabled: false, checkedAt: now }
    return false
  }
}

function withCsp(res: NextResponse, nonce: string, csp: string): NextResponse {
  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('x-nonce', nonce)
  return res
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Hotlink protection for uploads ────────────────────────────────────────
  if (pathname.startsWith('/uploads/')) {
    const referer = req.headers.get('referer')
    if (!referer) return NextResponse.next()
    try {
      const refHost = new URL(referer).host.toLowerCase()
      if (allowedReferHosts().has(refHost)) return NextResponse.next()
    } catch { /* malformed referer */ }
    return new NextResponse('Forbidden', { status: 403 })
  }

  const attachCsp = shouldAttachCsp(pathname)
  const nonce = attachCsp ? Buffer.from(crypto.randomUUID()).toString('base64') : ''
  const csp = attachCsp ? buildCsp(nonce) : ''

  // ── Maintenance mode check ────────────────────────────────────────────────
  const bypass = MAINTENANCE_BYPASS.some(p => pathname.startsWith(p))
  if (!bypass && await isMaintenanceEnabled()) {
    const maintenanceUrl = req.nextUrl.clone()
    maintenanceUrl.pathname = '/maintenance'
    const res = NextResponse.rewrite(maintenanceUrl)
    return attachCsp ? withCsp(res, nonce, csp) : res
  }

  if (!attachCsp) return NextResponse.next()

  // Propagate the nonce into the request headers so server components can
  // read it via `headers().get('x-nonce')` and thread it through <Script>.
  // Next.js also picks up the nonce from the response CSP to nonce its own
  // bootstrap + chunk <script> tags.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const res = NextResponse.next({ request: { headers: requestHeaders } })
  return withCsp(res, nonce, csp)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
