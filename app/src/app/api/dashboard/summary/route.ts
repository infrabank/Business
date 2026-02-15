import { NextRequest, NextResponse } from 'next/server'
import { bkend } from '@/lib/bkend'
import type { UsageRecord, Budget, Alert, Provider, ApiKey } from '@/types'
import type { DashboardSummary } from '@/types/dashboard'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    const [currentRecords, previousRecords, budgets, alerts] = await Promise.all([
      bkend.get<UsageRecord[]>('/usage-records', { token, params: { orgId, date_gte: thisMonthStart } }),
      bkend.get<UsageRecord[]>('/usage-records', { token, params: { orgId, date_gte: lastMonthStart, date_lte: lastMonthEnd } }),
      bkend.get<Budget[]>('/budgets', { token, params: { orgId, isActive: 'true' } }),
      bkend.get<Alert[]>('/alerts', { token, params: { orgId, isRead: 'false' } }),
    ])

    const currentTotal = currentRecords.reduce((sum, r) => sum + r.cost, 0)
    const previousTotal = previousRecords.reduce((sum, r) => sum + r.cost, 0)
    const changePercent = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0

    // By provider
    const providerMap = new Map<string, { cost: number; tokenCount: number; requestCount: number }>()
    for (const r of currentRecords) {
      const entry = providerMap.get(r.providerType) || { cost: 0, tokenCount: 0, requestCount: 0 }
      entry.cost += r.cost
      entry.tokenCount += r.totalTokens
      entry.requestCount += r.requestCount
      providerMap.set(r.providerType, entry)
    }

    // Top models
    const modelMap = new Map<string, { cost: number; tokenCount: number; requests: number }>()
    for (const r of currentRecords) {
      const entry = modelMap.get(r.model) || { cost: 0, tokenCount: 0, requests: 0 }
      entry.cost += r.cost
      entry.tokenCount += r.totalTokens
      entry.requests += r.requestCount
      modelMap.set(r.model, entry)
    }

    // Budget status
    const budgetStatus = budgets.map((b) => {
      const records = b.projectId
        ? currentRecords.filter((r) => r.orgId === orgId)
        : currentRecords
      const spent = records.reduce((sum, r) => sum + r.cost, 0)
      return {
        budgetId: b.id,
        name: b.projectId ? `Project Budget` : 'Total Budget',
        amount: b.amount,
        spent,
        percentage: (spent / b.amount) * 100,
      }
    })

    const summary: DashboardSummary = {
      totalCost: { current: currentTotal, previous: previousTotal, changePercent },
      byProvider: Array.from(providerMap.entries()).map(([type, data]) => ({
        type: type as DashboardSummary['byProvider'][0]['type'],
        ...data,
      })),
      byProject: [],
      topModels: Array.from(modelMap.entries())
        .map(([model, data]) => ({
          model,
          cost: data.cost,
          tokenCount: data.tokenCount,
          avgCostPerRequest: data.requests > 0 ? data.cost / data.requests : 0,
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5),
      budgetStatus,
      recentAlerts: alerts.slice(0, 5),
    }

    return NextResponse.json(summary)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load summary' },
      { status: 500 },
    )
  }
}
