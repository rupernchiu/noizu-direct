import { redis } from '@/lib/redis'

// M6 — Redis-failure posture. Previously we always fell back to an
// in-memory Map when Upstash threw, which worked per-isolate but let a
// clever attacker rotate across edge regions and effectively bypass the
// limiter. In production we now fail CLOSED: if Redis is unreachable,
// rate-limited endpoints return 429 (erring on availability, correctly
// for security). In development we keep the in-memory fallback so
// engineers aren't blocked when they don't have UPSTASH env vars set.
const memoryBuckets = new Map<string, { count: number; resetAt: number }>()
const isProd = process.env.NODE_ENV === 'production'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function clientIp(req: { headers: Headers }): string {
  const h = req.headers
  const cf = h.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  const real = h.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

/**
 * Fixed-window rate limiter backed by Upstash Redis.
 *
 * Semantics: the first request in a new window sets an atomic INCR+EXPIRE
 * via a pipeline. Subsequent requests in the window increment and compare
 * to the limit. Fails CLOSED in production if Redis is unreachable;
 * falls back to an in-memory per-isolate map in development only.
 */
export async function rateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `rl:${scope}:${identifier}`
  const now = Date.now()

  try {
    const pipeline = redis.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, windowSeconds, 'NX')
    pipeline.pttl(key)
    const [count, , ttl] = (await pipeline.exec()) as [number, unknown, number]

    const resetAt = ttl > 0 ? now + ttl : now + windowSeconds * 1000
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    }
  } catch (err) {
    // Log enough detail to alert on in observability.
    console.error('[rate-limit] redis unavailable', {
      scope,
      identifier,
      err: err instanceof Error ? err.message : String(err),
    })
    if (isProd) {
      // Fail closed. A prod outage here denies further requests until Redis
      // recovers — availability cost, but eliminates cross-region bypass.
      return { allowed: false, remaining: 0, resetAt: now + windowSeconds * 1000 }
    }
    // Dev: keep the in-memory best-effort fallback so local work isn't blocked.
    const bucket = memoryBuckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      memoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
      return { allowed: true, remaining: limit - 1, resetAt: now + windowSeconds * 1000 }
    }
    bucket.count++
    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      resetAt: bucket.resetAt,
    }
  }
}

export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}
