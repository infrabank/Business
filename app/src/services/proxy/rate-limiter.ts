import { getRedis } from './redis'

// In-memory fallback (resets on server restart)
const memStore = new Map<string, { timestamps: number[] }>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 5 * 60 * 1000

function cleanupMemory(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  const windowMs = 60_000
  for (const [key, entry] of memStore.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
    if (entry.timestamps.length === 0) memStore.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetMs: number
}

/**
 * Check rate limit using Redis sliding window counter.
 * Falls back to in-memory when Redis is unavailable.
 */
export async function checkRateLimit(
  proxyKeyId: string,
  maxRequestsPerMinute: number | null,
): Promise<RateLimitResult> {
  if (maxRequestsPerMinute === null || maxRequestsPerMinute <= 0) {
    return { allowed: true, limit: 0, remaining: Infinity, resetMs: 0 }
  }

  const r = getRedis()
  if (r) {
    try {
      return await checkRateLimitRedis(r, proxyKeyId, maxRequestsPerMinute)
    } catch {
      // Fall through to in-memory
    }
  }

  return checkRateLimitMemory(proxyKeyId, maxRequestsPerMinute)
}

async function checkRateLimitRedis(
  r: ReturnType<typeof getRedis> & object,
  proxyKeyId: string,
  limit: number,
): Promise<RateLimitResult> {
  const minuteBucket = Math.floor(Date.now() / 60_000)
  const key = `lcm:rl:${proxyKeyId}:${minuteBucket}`

  const count = await r.incr(key)

  // Set TTL on first increment (120s to cover window boundary)
  if (count === 1) {
    await r.expire(key, 120)
  }

  if (count > limit) {
    const resetMs = (minuteBucket + 1) * 60_000 - Date.now()
    return { allowed: false, limit, remaining: 0, resetMs }
  }

  return {
    allowed: true,
    limit,
    remaining: limit - count,
    resetMs: 0,
  }
}

function checkRateLimitMemory(
  proxyKeyId: string,
  limit: number,
): RateLimitResult {
  cleanupMemory()

  const now = Date.now()
  const windowMs = 60_000

  let entry = memStore.get(proxyKeyId)
  if (!entry) {
    entry = { timestamps: [] }
    memStore.set(proxyKeyId, entry)
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)

  if (entry.timestamps.length >= limit) {
    const resetMs = entry.timestamps[0] + windowMs - now
    return { allowed: false, limit, remaining: 0, resetMs }
  }

  entry.timestamps.push(now)
  return {
    allowed: true,
    limit,
    remaining: limit - entry.timestamps.length,
    resetMs: 0,
  }
}

export function buildRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: {
        message: `Rate limit exceeded. Max ${result.limit} requests per minute.`,
        type: 'rate_limit_exceeded',
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
        'Retry-After': String(Math.ceil(result.resetMs / 1000)),
      },
    },
  )
}
