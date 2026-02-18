import { bkendService } from '@/lib/bkend'
import { dispatchNotification } from '@/services/notification.service'
import { getRedis } from './redis'
import type { Alert } from '@/types'
import type { AlertType } from '@/types/alert'

const DEDUP_TTL = 45 * 24 * 60 * 60 // 45 days

/**
 * Check budget thresholds and create alerts (deduped per month per threshold).
 * Creates a DB alert record AND dispatches to external channels (email/slack/webhook).
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

    // Map threshold to proper AlertType
    const alertType: AlertType = threshold >= 1.0 ? 'budget_exceeded' : 'budget_warning'
    const pct = Math.round(threshold * 100)
    const title = threshold >= 1.0
      ? '프록시 키 예산 초과'
      : `프록시 키 예산 ${pct}% 도달`
    const nowIso = now.toISOString()

    // Create alert record
    const alert = await bkendService.post<Alert>('/alerts', {
      orgId,
      type: alertType,
      title,
      message: `프록시 키 예산 ${pct}% 도달 ($${currentSpend.toFixed(2)} / $${budgetLimit.toFixed(2)})`,
      metadata: {
        proxyKeyId,
        threshold,
        currentSpend,
        budgetLimit,
        severity: threshold >= 1.0 ? 'critical' : threshold >= 0.9 ? 'warning' : 'info',
      },
      isRead: false,
      sentAt: nowIso,
    } as Record<string, unknown>)

    // Dispatch to external channels (email/slack/webhook) — fire-and-forget
    dispatchNotification(alert, orgId, '').catch(() => {})
  }
}
