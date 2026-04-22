import { redis } from '@/lib/redis'

// In-memory fallback when Upstash is unreachable or unconfigured.
// Best-effort across lambdas — one per edge region — but prevents a
// misconfigured Redis from disabling all rate limiting silently.
const memoryBuckets = new Map<string, { count: number; resetAt: number }>()

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
 * to the limit. Falls back to an in-memory Map if Redis is unreachable —
 * better to throttle per-region than not at all.
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
  } catch {
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
