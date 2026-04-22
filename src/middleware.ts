import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

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

  // ── Maintenance mode check ────────────────────────────────────────────────
  const bypass = MAINTENANCE_BYPASS.some(p => pathname.startsWith(p))
  if (!bypass && await isMaintenanceEnabled()) {
    const maintenanceUrl = req.nextUrl.clone()
    maintenanceUrl.pathname = '/maintenance'
    return NextResponse.rewrite(maintenanceUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
