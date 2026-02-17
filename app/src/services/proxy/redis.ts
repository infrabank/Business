import { Redis } from '@upstash/redis'

let redis: Redis | null = null

/**
 * Shared Redis client for proxy services (cache, rate limiter, budget counter).
 * Lazy-initialized. Returns null when env vars are missing (local dev without Redis).
 */
export function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}
