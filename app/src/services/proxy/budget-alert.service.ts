import { bkendService } from '@/lib/bkend'
import { getRedis } from './redis'

const DEDUP_TTL = 45 * 24 * 60 * 60 // 45 days

/**
 * Check budget thresholds and create alerts (deduped per month per threshold).
 * Fire-and-forget — errors should not affect proxy flow.
 */
export async function checkBudgetAlerts(
  proxyKeyId: string,
  orgId: string,
  currentSpend: number,
  budgetLimit: number,
  thresholds: number[],
): Promise<void> {
  if (!thresholds || thresholds.length === 0 || budgetLimit <= 0) return

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const r = getRedis()

  for (const threshold of thresholds) {
    const thresholdAmount = budgetLimit * threshold
    if (currentSpend < thresholdAmount) continue

    const dedupKey = `lcm:budget-alert:${proxyKeyId}:${month}:${threshold}`

    // Check dedup via Redis
    if (r) {
      try {
        const exists = await r.exists(dedupKey)
        if (exists) continue
        await r.set(dedupKey, '1', { ex: DEDUP_TTL })
      } catch {
        // Continue without dedup on Redis failure
      }
    }

    // Create alert record
    const pct = Math.round(threshold * 100)
    await bkendService.post('/alerts', {
      orgId,
      type: 'budget_threshold',
      severity: threshold >= 1.0 ? 'critical' : threshold >= 0.9 ? 'warning' : 'info',
      message: `프록시 키 예산 ${pct}% 도달 ($${currentSpend.toFixed(2)} / $${budgetLimit.toFixed(2)})`,
      metadata: JSON.stringify({
        proxyKeyId,
        threshold,
        currentSpend,
        budgetLimit,
      }),
      isRead: false,
    } as Record<string, unknown>)
  }
}
