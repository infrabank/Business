import { bkend } from '@/lib/bkend'
import type { UsageRecord } from '@/types'
import type { DailyUsageStats, HourlyUsageStats, ModelUsageStats } from '@/types/anomaly'

/**
 * Get daily cost totals for the last N days.
 */
export async function getDailyUsageStats(
  orgId: string,
  days: number,
  token: string,
): Promise<DailyUsageStats[]> {
  const from = new Date()
  from.setDate(from.getDate() - days)
  const records = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: { orgId, date_gte: from.toISOString().split('T')[0] },
  })

  const byDate = new Map<string, { cost: number; requests: number }>()
  for (const r of records) {
    const entry = byDate.get(r.date) ?? { cost: 0, requests: 0 }
    entry.cost += r.cost
    entry.requests += r.requestCount
    byDate.set(r.date, entry)
  }

  return Array.from(byDate.entries())
    .map(([date, v]) => ({ date, totalCost: v.cost, requestCount: v.requests }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get hourly cost totals for the last N hours.
 */
export async function getHourlyUsageStats(
  orgId: string,
  hours: number,
  token: string,
): Promise<HourlyUsageStats[]> {
  const from = new Date()
  from.setHours(from.getHours() - hours)
  const records = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: { orgId, createdAt_gte: from.toISOString() },
  })

  const byHour = new Map<string, number>()
  for (const r of records) {
    const hour = r.createdAt.slice(0, 13)
    byHour.set(hour, (byHour.get(hour) ?? 0) + r.cost)
  }

  return Array.from(byHour.entries())
    .map(([hour, totalCost]) => ({ hour, totalCost }))
    .sort((a, b) => a.hour.localeCompare(b.hour))
}

/**
 * Get per-model usage summary for the last N days.
 */
export async function getModelUsageStats(
  orgId: string,
  days: number,
  token: string,
): Promise<ModelUsageStats[]> {
  const from = new Date()
  from.setDate(from.getDate() - days)
  const records = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: { orgId, date_gte: from.toISOString().split('T')[0] },
  })

  const byModel = new Map<string, { cost: number; requests: number; lastDate: string }>()
  for (const r of records) {
    const entry = byModel.get(r.model) ?? { cost: 0, requests: 0, lastDate: '' }
    entry.cost += r.cost
    entry.requests += r.requestCount
    if (r.date > entry.lastDate) entry.lastDate = r.date
    byModel.set(r.model, entry)
  }

  const today = new Date()
  return Array.from(byModel.entries()).map(([model, v]) => ({
    model,
    totalCost: v.cost,
    requestCount: v.requests,
    daysSinceLastUsed: Math.floor(
      (today.getTime() - new Date(v.lastDate).getTime()) / (1000 * 60 * 60 * 24)
    ),
  }))
}
