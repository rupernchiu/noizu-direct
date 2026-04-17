import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const CACHE_KEYS = {
  trending: 'trending:products',
  marketplace: (page: number, filters: string) => `marketplace:${page}:${filters}`,
  creator: (username: string) => `creator:${username}`,
  blogPosts: 'blog:posts',
  blogPost: (slug: string) => `blog:post:${slug}`,
  platformSettings: 'platform:settings',
  search: (query: string) => `search:${query}`,
}

export const CACHE_TTL = {
  trending: 1800,
  marketplace: 300,
  creator: 600,
  blogPosts: 86400,
  blogPost: 86400,
  platformSettings: 3600,
  search: 120,
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key)
  } catch {
    return null
  }
}

export async function setCached(key: string, data: unknown, ttl: number) {
  try {
    await redis.setex(key, ttl, data)
  } catch {
    // fail silently — cache miss is not fatal
  }
}

export async function invalidateCache(...keys: string[]) {
  try {
    await Promise.all(keys.map(key => redis.del(key)))
  } catch {
    // fail silently
  }
}

export async function invalidatePattern(pattern: string) {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redis.del(key)))
    }
  } catch {
    // fail silently
  }
}
