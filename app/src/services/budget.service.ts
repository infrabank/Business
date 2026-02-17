import { bkend } from '@/lib/bkend'
import type { Budget, Alert } from '@/types'
import { dispatchNotification } from './notification.service'

interface UsageAggregation {
  totalCost: number
}

export async function checkBudgetThresholds(orgId: string, token: string): Promise<Alert[]> {
  const budgets = await bkend.get<Budget[]>('/budgets', { token, params: { orgId, isActive: 'true' } })
  const alerts: Alert[] = []

  for (const budget of budgets) {
    const params: Record<string, string> = { orgId }
    if (budget.projectId) params.projectId = budget.projectId

    // Get current period usage
    const periodStart = getPeriodStart(budget.period)
    params.date_gte = periodStart.toISOString().split('T')[0]

    const usage = await bkend.get<UsageAggregation>('/usage-records/aggregate', { token, params })
    const percentage = (usage.totalCost / budget.amount) * 100

    for (const threshold of budget.alertThresholds.sort((a, b) => b - a)) {
      if (percentage >= threshold) {
        const alertType = threshold >= 100 ? 'budget_exceeded' : 'budget_warning'

        // Check if alert already sent for this threshold
        const existing = await bkend.get<Alert[]>('/alerts', {
          token,
          params: {
            orgId,
            type: alertType,
            'metadata.budgetId': budget.id,
            'metadata.threshold': String(threshold),
          },
        })

        if (existing.length === 0) {
          const alert = await bkend.post<Alert>('/alerts', {
            orgId,
            type: alertType,
            title: `Budget ${threshold >= 100 ? 'exceeded' : `at ${threshold}%`}`,
            message: `Spending is at ${percentage.toFixed(1)}% of the $${budget.amount} budget.`,
            metadata: { budgetId: budget.id, threshold, percentage },
            isRead: false,
            sentAt: new Date().toISOString(),
          }, { token })

          alerts.push(alert)

          // Dispatch to external notification channels
          try {
            await dispatchNotification(alert, orgId, token)
          } catch {
            // fire-and-forget: notification failure should not block budget check
          }
        }

        break // Only trigger highest threshold
      }
    }
  }

  return alerts
}

function getPeriodStart(period: string): Date {
  const now = new Date()
  if (period === 'weekly') {
    const day = now.getDay()
    now.setDate(now.getDate() - day)
  } else {
    now.setDate(1)
  }
  now.setHours(0, 0, 0, 0)
  return now
}
