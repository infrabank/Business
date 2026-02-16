import { createHash } from 'crypto'

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

// Module-level cache state
const cache = new Map<string, CacheEntry>()
const MAX_CACHE_ENTRIES = 1000
const DEFAULT_TTL_SECONDS = 3600

// Statistics tracking
let totalHits = 0
let totalMisses = 0
let totalSaved = 0

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
  // Extract semantic fields based on provider
  const keyData: Record<string, unknown> = {
    provider: providerType,
    model,
  }

  // Include temperature and max_tokens if present (they affect output)
  if (body.temperature !== undefined) {
    keyData.temperature = body.temperature
  }
  if (body.max_tokens !== undefined) {
    keyData.max_tokens = body.max_tokens
  }

  // Extract message content based on provider format
  if (providerType === 'openai' || providerType === 'anthropic') {
    // OpenAI/Anthropic use "messages" array
    if (Array.isArray(body.messages)) {
      keyData.messages = body.messages
    }
  } else if (providerType === 'google') {
    // Google uses "contents" array
    if (Array.isArray(body.contents)) {
      keyData.contents = body.contents
    }
  }

  // Serialize to JSON and hash
  const keyString = JSON.stringify(keyData)
  return createHash('sha256').update(keyString).digest('hex')
}

/**
 * Get cached response (returns null if miss or expired)
 */
export function getCachedResponse(key: string): CacheEntry | null {
  const entry = cache.get(key)

  if (!entry) {
    totalMisses++
    return null
  }

  // Check if expired
  const now = Date.now()
  const age = (now - entry.timestamp) / 1000 // seconds
  if (age > entry.ttlSeconds) {
    cache.delete(key)
    totalMisses++
    return null
  }

  // Cache hit - update LRU position (delete and re-insert)
  cache.delete(key)
  cache.set(key, entry)

  totalHits++
  totalSaved += entry.cost
  return entry
}

/**
 * Store response in cache
 * Evicts oldest entry if cache is full (LRU eviction - first entry is oldest)
 */
export function setCachedResponse(
  key: string,
  entry: Omit<CacheEntry, 'timestamp'>,
  ttlSeconds = DEFAULT_TTL_SECONDS
): void {
  // Evict oldest entry if cache is full and key is new
  if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(key)) {
    // First entry is the oldest (LRU maintained by delete/re-insert on access)
    const firstKey = cache.keys().next().value
    if (firstKey) {
      cache.delete(firstKey)
    }
  }

  // Store new entry
  cache.set(key, {
    ...entry,
    timestamp: Date.now(),
    ttlSeconds,
  })
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  const total = totalHits + totalMisses
  const hitRate = total > 0 ? (totalHits / total) * 100 : 0

  return {
    totalHits,
    totalMisses,
    totalSaved,
    entries: cache.size,
    hitRate: Math.round(hitRate * 100) / 100, // round to 2 decimals
  }
}

/**
 * Reset cache (for testing)
 */
export function resetCache(): void {
  cache.clear()
  totalHits = 0
  totalMisses = 0
  totalSaved = 0
}
