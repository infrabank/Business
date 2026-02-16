import { bkendService } from '@/lib/bkend'
import type { ProxyLog } from '@/types/proxy'

export interface BudgetCheckResult {
  allowed: boolean
  currentSpend: number
  budgetLimit: number
  remainingBudget: number
}

export async function checkBudget(
  orgId: string,
  proxyKeyId: string,
  budgetLimit: number | null,
): Promise<BudgetCheckResult> {
  // No budget limit set — always allowed
  if (budgetLimit === null || budgetLimit <= 0) {
    return { allowed: true, currentSpend: 0, budgetLimit: 0, remainingBudget: Infinity }
  }

  // Get current month's spend for this proxy key
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  try {
    const logs = await bkendService.get<ProxyLog[]>('/proxy-logs', {
      params: {
        proxyKeyId,
        orgId,
        createdAt_gte: monthStart,
      },
    })

    const currentSpend = logs.reduce((sum, log) => sum + Number(log.cost), 0)
    const remainingBudget = budgetLimit - currentSpend

    return {
      allowed: currentSpend < budgetLimit,
      currentSpend: Math.round(currentSpend * 10000) / 10000,
      budgetLimit,
      remainingBudget: Math.round(remainingBudget * 10000) / 10000,
    }
  } catch {
    // If budget check fails, allow the request (fail-open for MVP)
    return { allowed: true, currentSpend: 0, budgetLimit, remainingBudget: budgetLimit }
  }
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
