import { bkendService } from '@/lib/bkend'
import { getRedis } from './redis'
import type { ProxyLog } from '@/types/proxy'

export interface BudgetCheckResult {
  allowed: boolean
  currentSpend: number
  budgetLimit: number
  remainingBudget: number
}

const TTL_SECONDS = 45 * 24 * 60 * 60 // 45 days

// In-memory fallback counters (reset on server restart)
const memBudget = new Map<string, number>()

function budgetKey(proxyKeyId: string): string {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return `lcm:budget:${proxyKeyId}:${month}`
}

/**
 * O(1) budget check via Redis GET.
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

  const r = getRedis()
  if (r) {
    try {
      const key = budgetKey(proxyKeyId)
      const val = await r.get<number>(key)
      const currentSpend = val ?? 0
      const remainingBudget = budgetLimit - currentSpend

      return {
        allowed: currentSpend < budgetLimit,
        currentSpend: Math.round(currentSpend * 10000) / 10000,
        budgetLimit,
        remainingBudget: Math.round(remainingBudget * 10000) / 10000,
      }
    } catch {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const memKey = budgetKey(proxyKeyId)
  const currentSpend = memBudget.get(memKey) ?? 0
  const remainingBudget = budgetLimit - currentSpend

  return {
    allowed: currentSpend < budgetLimit,
    currentSpend: Math.round(currentSpend * 10000) / 10000,
    budgetLimit,
    remainingBudget: Math.round(remainingBudget * 10000) / 10000,
  }
}

/**
 * Increment budget spend after each successful request.
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
  return new Response(
    JSON.stringify({
      error: {
        message: `Monthly budget limit exceeded. Current spend: $${result.currentSpend.toFixed(4)}, limit: $${result.budgetLimit.toFixed(2)}`,
        type: 'budget_exceeded',
        currentSpend: result.currentSpend,
        budgetLimit: result.budgetLimit,
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-Budget-Limit': String(result.budgetLimit),
        'X-Budget-Spent': String(result.currentSpend),
        'Retry-After': '3600',
      },
    },
  )
}
