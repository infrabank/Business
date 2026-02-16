import { bkendService } from '@/lib/bkend'
import { COMMISSION_RATE } from '@/lib/constants'
import type { CommissionInfo } from '@/types/billing'

interface ProxyLog {
  id: string
  savedAmount?: number
  createdAt: string
}

export async function getMonthlyCommission(orgId: string): Promise<CommissionInfo> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const logs = await bkendService.get<ProxyLog[]>('/proxy-logs', {
    params: {
      orgId,
      createdAt_gte: periodStart.toISOString(),
      createdAt_lte: periodEnd.toISOString(),
    },
  })

  const totalSavings = logs.reduce((sum, l) => sum + (l.savedAmount || 0), 0)

  return {
    currentMonthSavings: Math.round(totalSavings * 100) / 100,
    commissionRate: COMMISSION_RATE,
    commissionAmount: Math.round(totalSavings * COMMISSION_RATE * 100) / 100,
    requestCount: logs.length,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  }
}
