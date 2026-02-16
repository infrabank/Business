interface RateLimitEntry {
  timestamps: number[]
}

// In-memory store (resets on server restart — acceptable for MVP)
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  const windowMs = 60_000
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetMs: number
}

export function checkRateLimit(
  proxyKeyId: string,
  maxRequestsPerMinute: number | null,
): RateLimitResult {
  // No rate limit set
  if (maxRequestsPerMinute === null || maxRequestsPerMinute <= 0) {
    return { allowed: true, limit: 0, remaining: Infinity, resetMs: 0 }
  }

  cleanup()

  const now = Date.now()
  const windowMs = 60_000
  const key = proxyKeyId

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)

  if (entry.timestamps.length >= maxRequestsPerMinute) {
    const oldestInWindow = entry.timestamps[0]
    const resetMs = oldestInWindow + windowMs - now

    return {
      allowed: false,
      limit: maxRequestsPerMinute,
      remaining: 0,
      resetMs,
    }
  }

  // Record this request
  entry.timestamps.push(now)

  return {
    allowed: true,
    limit: maxRequestsPerMinute,
    remaining: maxRequestsPerMinute - entry.timestamps.length,
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
