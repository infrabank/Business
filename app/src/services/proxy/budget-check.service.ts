import { bkendService } from '@/lib/bkend'
import { getRedis } from './redis'
import type { ProxyLog } from '@/types/proxy'

export type BudgetDuration = 'daily' | 'weekly' | 'monthly'

export interface BudgetCheckResult {
  allowed: boolean
  currentSpend: number
  budgetLimit: number
  remainingBudget: number
  blockedBy?: 'key' | 'team' | 'org' // which level blocked the request
}

export interface BudgetLayer {
  level: 'key' | 'team' | 'org'
  id: string
  limit: number
  duration: BudgetDuration
}

const TTL_SECONDS = 45 * 24 * 60 * 60 // 45 days

// In-memory fallback counters (reset on server restart)
const memBudget = new Map<string, number>()

/**
 * Get the budget period key suffix based on duration
 */
function getPeriodSuffix(duration: BudgetDuration): string {
  const now = new Date()
  switch (duration) {
    case 'daily':
      return now.toISOString().split('T')[0] // 2026-02-18
    case 'weekly': {
      // ISO week: Monday-based week number
      const d = new Date(now)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
      return d.toISOString().split('T')[0] // Monday's date as key
    }
    case 'monthly':
    default:
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
}

/**
 * Get TTL in seconds for a budget duration
 */
function getDurationTtl(duration: BudgetDuration): number {
  switch (duration) {
    case 'daily': return 2 * 24 * 60 * 60 // 2 days
    case 'weekly': return 10 * 24 * 60 * 60 // 10 days
    case 'monthly':
    default: return TTL_SECONDS
  }
}

function budgetKey(proxyKeyId: string, duration: BudgetDuration = 'monthly'): string {
  return `lcm:budget:${proxyKeyId}:${getPeriodSuffix(duration)}`
}

function layerBudgetKey(level: string, id: string, duration: BudgetDuration): string {
  return `lcm:budget:${level}:${id}:${getPeriodSuffix(duration)}`
}

/**
 * Get current spend from Redis or memory for a given budget key
 */
async function getSpend(key: string): Promise<number> {
  const r = getRedis()
  if (r) {
    try {
      const val = await r.get<number>(key)
      return val ?? 0
    } catch {
      // Fall through
    }
  }
  return memBudget.get(key) ?? 0
}

/**
 * Check a single budget layer
 */
async function checkLayer(
  level: string,
  id: string,
  limit: number,
  duration: BudgetDuration
): Promise<BudgetCheckResult & { key: string }> {
  const key = layerBudgetKey(level, id, duration)
  const currentSpend = await getSpend(key)
  const remainingBudget = limit - currentSpend

  return {
    allowed: currentSpend < limit,
    currentSpend: Math.round(currentSpend * 10000) / 10000,
    budgetLimit: limit,
    remainingBudget: Math.round(remainingBudget * 10000) / 10000,
    key,
  }
}

/**
 * Multi-layer budget check: key → team → org (any layer can block)
 * Falls back to single-layer check for backward compatibility.
 */
export async function checkBudgetMultiLayer(
  layers: BudgetLayer[]
): Promise<BudgetCheckResult> {
  if (layers.length === 0) {
    return { allowed: true, currentSpend: 0, budgetLimit: 0, remainingBudget: Infinity }
  }

  for (const layer of layers) {
    if (layer.limit <= 0) continue
    const result = await checkLayer(layer.level, layer.id, layer.limit, layer.duration)
    if (!result.allowed) {
      return {
        allowed: false,
        currentSpend: result.currentSpend,
        budgetLimit: result.budgetLimit,
        remainingBudget: result.remainingBudget,
        blockedBy: layer.level,
      }
    }
  }

  // All layers passed - return the most restrictive layer's info
  const mostRestrictive = layers
    .filter((l) => l.limit > 0)
    .sort((a, b) => a.limit - b.limit)[0]

  if (!mostRestrictive) {
    return { allowed: true, currentSpend: 0, budgetLimit: 0, remainingBudget: Infinity }
  }

  const result = await checkLayer(
    mostRestrictive.level,
    mostRestrictive.id,
    mostRestrictive.limit,
    mostRestrictive.duration
  )
  return {
    allowed: true,
    currentSpend: result.currentSpend,
    budgetLimit: result.budgetLimit,
    remainingBudget: result.remainingBudget,
  }
}

/**
 * O(1) budget check via Redis GET (backward-compatible single-layer).
 * Falls back to in-memory counter, then to DB query.
 */
export async function checkBudget(
  orgId: string,
  proxyKeyId: string,
  budgetLimit: number | null,
): Promise<BudgetCheckResult> {
  if (budgetLimit === null || budgetLimit <= 0) {
    return { allowed: true, currentSpend: 0, budgetLimit: 0, remainingBudget: Infinity }
  }

  const key = budgetKey(proxyKeyId)
  const currentSpend = await getSpend(key)
  const remainingBudget = budgetLimit - currentSpend

  return {
    allowed: currentSpend < budgetLimit,
    currentSpend: Math.round(currentSpend * 10000) / 10000,
    budgetLimit,
    remainingBudget: Math.round(remainingBudget * 10000) / 10000,
  }
}

/**
 * Increment budget spend at multiple layers atomically.
 * Uses Redis INCRBYFLOAT for atomic O(1) update per layer.
 */
export async function incrementBudgetSpendMultiLayer(
  layers: BudgetLayer[],
  cost: number,
): Promise<void> {
  if (cost <= 0) return

  const r = getRedis()

  for (const layer of layers) {
    const key = layerBudgetKey(layer.level, layer.id, layer.duration)
    const ttl = getDurationTtl(layer.duration)

    if (r) {
      try {
        const newVal = await r.incrbyfloat(key, cost)
        if (Math.abs(newVal - cost) < 0.000001) {
          await r.expire(key, ttl)
        }
        continue
      } catch {
        // Fall through to in-memory
      }
    }

    const prev = memBudget.get(key) ?? 0
    memBudget.set(key, prev + cost)
  }
}

/**
 * Increment budget spend after each successful request (backward-compatible).
 * Uses Redis INCRBYFLOAT for atomic O(1) update.
 */
export async function incrementBudgetSpend(
  proxyKeyId: string,
  cost: number,
): Promise<void> {
  if (cost <= 0) return

  const key = budgetKey(proxyKeyId)

  const r = getRedis()
  if (r) {
    try {
      const newVal = await r.incrbyfloat(key, cost)
      // Set TTL on first increment (when value equals cost, it's new)
      if (Math.abs(newVal - cost) < 0.000001) {
        await r.expire(key, TTL_SECONDS)
      }
      return
    } catch {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const prev = memBudget.get(key) ?? 0
  memBudget.set(key, prev + cost)
}

/**
 * Reconcile budget counter from proxy_logs.
 * Called by daily cron to keep Redis counter accurate.
 */
export async function reconcileBudgetCounter(
  proxyKeyId: string,
  orgId: string,
): Promise<void> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const logs = await bkendService.get<ProxyLog[]>('/proxy-logs', {
    params: {
      proxyKeyId,
      orgId,
      createdAt_gte: monthStart,
    },
  })

  const totalSpend = logs.reduce((sum, log) => sum + Number(log.cost), 0)

  const r = getRedis()
  const key = budgetKey(proxyKeyId)

  if (r) {
    try {
      await r.set(key, totalSpend, { ex: TTL_SECONDS })
      return
    } catch {
      // Fall through to memory
    }
  }

  memBudget.set(key, totalSpend)
}

export function buildBudgetExceededResponse(result: BudgetCheckResult): Response {
  const levelLabel = result.blockedBy
    ? { key: 'Key', team: 'Team', org: 'Organization' }[result.blockedBy]
    : 'Monthly'

  return new Response(
    JSON.stringify({
      error: {
        message: `${levelLabel} budget limit exceeded. Current spend: $${result.currentSpend.toFixed(4)}, limit: $${result.budgetLimit.toFixed(2)}`,
        type: 'budget_exceeded',
        currentSpend: result.currentSpend,
        budgetLimit: result.budgetLimit,
        blockedBy: result.blockedBy || 'key',
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-Budget-Limit': String(result.budgetLimit),
        'X-Budget-Spent': String(result.currentSpend),
        ...(result.blockedBy ? { 'X-Budget-Blocked-By': result.blockedBy } : {}),
        'Retry-After': '3600',
      },
    },
  )
}
