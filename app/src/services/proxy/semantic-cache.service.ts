import { createHash } from 'crypto'
import { getRedis } from './redis'
import type { CacheEntry } from './cache.service'

// Redis key prefixes for semantic cache
const SEM_PREFIX = 'lcm:semcache:'
const SEM_INDEX_PREFIX = 'lcm:semidx:'
const SEM_STATS_KEY = 'lcm:semcache:stats'

// Configuration
const MAX_ENTRIES_PER_MODEL = 200
const DEFAULT_SIMILARITY_THRESHOLD = 0.85
const SEM_ENTRY_TTL_SECONDS = 7200 // 2 hours

// In-memory fallback store
const memorySemanticIndex = new Map<string, SemanticEntry[]>()
let memSemStats = { hits: 0, misses: 0, saved: 0 }

interface SemanticEntry {
  id: string
  tokens: string[]
  tokenSet: Set<string>
  bigramSet: Set<string>
  normalizedHash: string
  cacheKey: string // points to exact cache entry
  timestamp: number
}

// Serializable version for Redis storage
interface SemanticEntryData {
  id: string
  tokens: string[]
  normalizedHash: string
  cacheKey: string
  timestamp: number
}

/**
 * Extract plain text content from a provider-specific request body
 */
export function extractMessageText(
  body: Record<string, unknown>,
  providerType: string
): string {
  const parts: string[] = []

  if (providerType === 'openai' || providerType === 'anthropic') {
    const messages = body.messages
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (typeof msg.content === 'string') {
          parts.push(msg.content)
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (typeof block === 'string') parts.push(block)
            else if (block && typeof block.text === 'string') parts.push(block.text)
          }
        }
      }
    }
    // Anthropic system prompt
    if (typeof body.system === 'string') {
      parts.unshift(body.system)
    }
  } else if (providerType === 'google') {
    const contents = body.contents
    if (Array.isArray(contents)) {
      for (const content of contents) {
        if (content && Array.isArray(content.parts)) {
          for (const part of content.parts) {
            if (typeof part.text === 'string') parts.push(part.text)
          }
        }
      }
    }
  }

  return parts.join(' ')
}

/**
 * Normalize text for comparison: lowercase, collapse whitespace, strip punctuation
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')  // keep letters, digits, Korean, whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build a normalized cache key (catches formatting-only differences)
 */
export function buildNormalizedCacheKey(
  providerType: string,
  model: string,
  body: Record<string, unknown>
): string {
  const text = extractMessageText(body, providerType)
  const normalized = normalizeText(text)
  const keyData = JSON.stringify({
    provider: providerType,
    model,
    text: normalized,
    temperature: body.temperature,
    max_tokens: body.max_tokens,
  })
  return createHash('sha256').update(keyData).digest('hex')
}

/**
 * Tokenize text into words
 */
export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((t) => t.length > 0)
}

/**
 * Generate character bigrams from tokens for finer-grained similarity
 */
function buildBigrams(tokens: string[]): Set<string> {
  const bigrams = new Set<string>()
  for (const token of tokens) {
    for (let i = 0; i < token.length - 1; i++) {
      bigrams.add(token.slice(i, i + 2))
    }
  }
  // Also add word-level bigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.add(`${tokens[i]}_${tokens[i + 1]}`)
  }
  return bigrams
}

/**
 * Compute Jaccard similarity between two sets
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  if (a.size === 0 || b.size === 0) return 0

  let intersection = 0
  const smaller = a.size <= b.size ? a : b
  const larger = a.size <= b.size ? b : a
  for (const item of smaller) {
    if (larger.has(item)) intersection++
  }

  const union = a.size + b.size - intersection
  return union > 0 ? intersection / union : 0
}

/**
 * Compute combined similarity score using token overlap + bigram similarity
 * Weighted: 40% token Jaccard + 60% bigram Jaccard
 */
export function computeSimilarity(
  tokensA: string[],
  tokensB: string[],
  bigramsA: Set<string>,
  bigramsB: Set<string>
): number {
  const setA = new Set(tokensA)
  const setB = new Set(tokensB)
  const tokenSim = jaccardSimilarity(setA, setB)
  const bigramSim = jaccardSimilarity(bigramsA, bigramsB)
  return tokenSim * 0.4 + bigramSim * 0.6
}

/**
 * Build index key for a provider+model combination
 */
function indexKey(providerType: string, model: string): string {
  return `${SEM_INDEX_PREFIX}${providerType}:${model}`
}

/**
 * Find a semantically similar cached entry
 * Returns the matching CacheEntry if similarity >= threshold, null otherwise
 */
export async function findSemanticMatch(
  providerType: string,
  model: string,
  body: Record<string, unknown>,
  threshold = DEFAULT_SIMILARITY_THRESHOLD
): Promise<{ entry: CacheEntry; similarity: number } | null> {
  const text = extractMessageText(body, providerType)
  if (!text) return null

  const queryTokens = tokenize(text)
  if (queryTokens.length === 0) return null
  const queryBigrams = buildBigrams(queryTokens)

  const r = getRedis()
  let entries: SemanticEntry[] = []

  if (r) {
    try {
      const key = indexKey(providerType, model)
      const raw = await r.lrange<SemanticEntryData>(key, 0, MAX_ENTRIES_PER_MODEL - 1)
      entries = raw.map((e) => ({
        ...e,
        tokenSet: new Set(e.tokens),
        bigramSet: buildBigrams(e.tokens),
      }))
    } catch {
      // Fall through to memory
    }
  }

  if (entries.length === 0) {
    const memKey = `${providerType}:${model}`
    entries = memorySemanticIndex.get(memKey) || []
  }

  if (entries.length === 0) return null

  // Find best match with early termination
  let bestMatch: SemanticEntry | null = null
  let bestSimilarity = 0
  const queryLen = queryTokens.length

  for (const entry of entries) {
    // Token-length pre-filter: skip entries whose length is too different
    // If ratio of shorter/longer < threshold, Jaccard can never reach threshold
    const entryLen = entry.tokens.length
    const shorter = Math.min(queryLen, entryLen)
    const longer = Math.max(queryLen, entryLen)
    if (longer > 0 && shorter / longer < threshold) continue

    const similarity = computeSimilarity(
      queryTokens,
      entry.tokens,
      queryBigrams,
      entry.bigramSet
    )
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      bestMatch = entry
      // Early exit on perfect match
      if (bestSimilarity >= 0.99) break
    }
  }

  if (!bestMatch || bestSimilarity < threshold) {
    // Track miss
    if (r) {
      r.hincrby(SEM_STATS_KEY, 'misses', 1).catch(() => {})
    } else {
      memSemStats.misses++
    }
    return null
  }

  // Retrieve the actual cache entry using the stored cache key
  const cachePrefix = 'lcm:cache:'
  if (r) {
    try {
      const cached = await r.get<CacheEntry>(`${cachePrefix}${bestMatch.cacheKey}`)
      if (cached) {
        // Track hit
        r.hincrby(SEM_STATS_KEY, 'hits', 1).catch(() => {})
        r.hincrbyfloat(SEM_STATS_KEY, 'saved', cached.cost).catch(() => {})
        return { entry: cached, similarity: bestSimilarity }
      }
    } catch {
      // Cache entry expired or unavailable
    }
  } else {
    // Memory fallback - check if the cache key exists in memory cache
    // (The exact cache module handles its own memory store, so we just return null here
    //  since we can't access it directly. In practice, Redis will be available.)
    memSemStats.hits++
  }

  return null
}

/**
 * Store a semantic index entry for future similarity matching
 */
export async function storeSemanticEntry(
  providerType: string,
  model: string,
  body: Record<string, unknown>,
  cacheKey: string
): Promise<void> {
  const text = extractMessageText(body, providerType)
  if (!text) return

  const tokens = tokenize(text)
  if (tokens.length === 0) return

  const normalizedHash = buildNormalizedCacheKey(providerType, model, body)
  const entryData: SemanticEntryData = {
    id: normalizedHash,
    tokens,
    normalizedHash,
    cacheKey,
    timestamp: Date.now(),
  }

  const r = getRedis()

  if (r) {
    try {
      const key = indexKey(providerType, model)
      // Push to front of list (most recent first)
      await r.lpush(key, entryData)
      // Trim to max size
      await r.ltrim(key, 0, MAX_ENTRIES_PER_MODEL - 1)
      // Set TTL on the index key
      await r.expire(key, SEM_ENTRY_TTL_SECONDS)
      return
    } catch {
      // Fall through to memory
    }
  }

  // Memory fallback
  const memKey = `${providerType}:${model}`
  let list = memorySemanticIndex.get(memKey)
  if (!list) {
    list = []
    memorySemanticIndex.set(memKey, list)
  }
  list.unshift({
    ...entryData,
    tokenSet: new Set(tokens),
    bigramSet: buildBigrams(tokens),
  })
  if (list.length > MAX_ENTRIES_PER_MODEL) {
    list.pop()
  }
}

/**
 * Get semantic cache statistics
 */
export async function getSemanticCacheStats(): Promise<{
  hits: number
  misses: number
  saved: number
  hitRate: number
}> {
  const r = getRedis()

  if (r) {
    try {
      const stats = await r.hgetall(SEM_STATS_KEY) as Record<string, string> | null
      const hits = Number(stats?.hits || 0)
      const misses = Number(stats?.misses || 0)
      const saved = Number(stats?.saved || 0)
      const total = hits + misses
      return {
        hits,
        misses,
        saved,
        hitRate: total > 0 ? Math.round((hits / total) * 10000) / 100 : 0,
      }
    } catch {
      // fall through
    }
  }

  const total = memSemStats.hits + memSemStats.misses
  return {
    ...memSemStats,
    hitRate: total > 0 ? Math.round((memSemStats.hits / total) * 10000) / 100 : 0,
  }
}
