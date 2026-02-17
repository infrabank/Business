import { createHash } from 'crypto'
import { getRedis } from './redis'

export interface CacheEntry {
  responseBody: string
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
  timestamp: number
  ttlSeconds: number
}

export interface CacheStats {
  totalHits: number
  totalMisses: number
  totalSaved: number // total $ saved from cache hits
  entries: number
  hitRate: number // percentage 0-100
}

// Cache key prefix to avoid collisions
const PREFIX = 'lcm:cache:'
const STATS_KEY = 'lcm:cache:stats'
const DEFAULT_TTL_SECONDS = 3600

// In-memory fallback when Redis is not configured
const memoryCache = new Map<string, CacheEntry>()
const MAX_MEMORY_ENTRIES = 1000
let memStats = { totalHits: 0, totalMisses: 0, totalSaved: 0 }

/**
 * Build cache key from request params
 * Includes: provider type, model, temperature, max_tokens, and message/content semantics
 * Excludes: stream, stream_options, top_p, and other non-semantic fields
 */
export function buildCacheKey(
  providerType: string,
  model: string,
  body: Record<string, unknown>
): string {
  const keyData: Record<string, unknown> = {
    provider: providerType,
    model,
  }

  if (body.temperature !== undefined) {
    keyData.temperature = body.temperature
  }
  if (body.max_tokens !== undefined) {
    keyData.max_tokens = body.max_tokens
  }

  if (providerType === 'openai' || providerType === 'anthropic') {
    if (Array.isArray(body.messages)) {
      keyData.messages = body.messages
    }
  } else if (providerType === 'google') {
    if (Array.isArray(body.contents)) {
      keyData.contents = body.contents
    }
  }

  const keyString = JSON.stringify(keyData)
  return createHash('sha256').update(keyString).digest('hex')
}

/**
 * Get cached response (returns null if miss or expired)
 * Uses Redis with in-memory fallback
 */
export async function getCachedResponse(key: string): Promise<CacheEntry | null> {
  const r = getRedis()

  if (r) {
    try {
      const entry = await r.get<CacheEntry>(`${PREFIX}${key}`)
      if (entry) {
        // Update stats in Redis (fire-and-forget)
        r.hincrby(STATS_KEY, 'totalHits', 1).catch(() => {})
        r.hincrbyfloat(STATS_KEY, 'totalSaved', entry.cost).catch(() => {})
        return entry
      }
      r.hincrby(STATS_KEY, 'totalMisses', 1).catch(() => {})
      return null
    } catch {
      // Fall through to memory cache on Redis error
    }
  }

  // In-memory fallback
  const entry = memoryCache.get(key)
  if (!entry) {
    memStats.totalMisses++
    return null
  }

  const age = (Date.now() - entry.timestamp) / 1000
  if (age > entry.ttlSeconds) {
    memoryCache.delete(key)
    memStats.totalMisses++
    return null
  }

  // LRU update
  memoryCache.delete(key)
  memoryCache.set(key, entry)
  memStats.totalHits++
  memStats.totalSaved += entry.cost
  return entry
}

/**
 * Store response in cache
 * Uses Redis with in-memory fallback
 */
export async function setCachedResponse(
  key: string,
  entry: Omit<CacheEntry, 'timestamp'>,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<void> {
  const fullEntry: CacheEntry = {
    ...entry,
    timestamp: Date.now(),
    ttlSeconds,
  }

  const r = getRedis()

  if (r) {
    try {
      await r.set(`${PREFIX}${key}`, fullEntry, { ex: ttlSeconds })
      return
    } catch {
      // Fall through to memory cache
    }
  }

  // In-memory fallback
  if (memoryCache.size >= MAX_MEMORY_ENTRIES && !memoryCache.has(key)) {
    const firstKey = memoryCache.keys().next().value
    if (firstKey) memoryCache.delete(firstKey)
  }
  memoryCache.set(key, fullEntry)
}

/**
 * Get cache statistics
 * Combines Redis stats with in-memory stats
 */
export async function getCacheStats(): Promise<CacheStats> {
  const r = getRedis()

  if (r) {
    try {
      const stats = await r.hgetall(STATS_KEY) as Record<string, string> | null
      const totalHits = Number(stats?.totalHits || 0)
      const totalMisses = Number(stats?.totalMisses || 0)
      const totalSaved = Number(stats?.totalSaved || 0)
      const total = totalHits + totalMisses
      const dbSize = await r.dbsize()

      return {
        totalHits,
        totalMisses,
        totalSaved,
        entries: dbSize,
        hitRate: total > 0 ? Math.round((totalHits / total) * 10000) / 100 : 0,
      }
    } catch {
      // Fall through to memory stats
    }
  }

  // In-memory fallback
  const total = memStats.totalHits + memStats.totalMisses
  return {
    totalHits: memStats.totalHits,
    totalMisses: memStats.totalMisses,
    totalSaved: memStats.totalSaved,
    entries: memoryCache.size,
    hitRate: total > 0 ? Math.round((memStats.totalHits / total) * 10000) / 100 : 0,
  }
}

/**
 * Reset cache (for testing)
 */
export async function resetCache(): Promise<void> {
  const r = getRedis()

  if (r) {
    try {
      // Delete all cache keys with prefix
      let cursor = '0'
      do {
        const [nextCursor, keys] = await r.scan(Number(cursor), { match: `${PREFIX}*`, count: 100 })
        cursor = String(nextCursor)
        if (keys.length > 0) {
          await r.del(...keys)
        }
      } while (cursor !== '0')
      await r.del(STATS_KEY)
    } catch {
      // Continue to clear memory cache
    }
  }

  memoryCache.clear()
  memStats = { totalHits: 0, totalMisses: 0, totalSaved: 0 }
}
