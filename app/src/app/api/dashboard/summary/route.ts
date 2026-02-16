import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { UsageRecord, Budget, Alert, OptimizationTip, Project, ProxyLog } from '@/types'
import type { DashboardSummary } from '@/types/dashboard'

const PROJECT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export async function GET(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  const providerTypesParam = req.nextUrl.searchParams.get('providerTypes')
  const providerFilter = providerTypesParam ? providerTypesParam.split(',') : null

  try {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    const [allCurrentRecords, allPreviousRecords, budgets, alerts, tips, projects, proxyLogs] = await Promise.all([
      bkend.get<UsageRecord[]>('/usage-records', { params: { orgId, date_gte: thisMonthStart } }),
      bkend.get<UsageRecord[]>('/usage-records', { params: { orgId, date_gte: lastMonthStart, date_lte: lastMonthEnd } }),
      bkend.get<Budget[]>('/budgets', { params: { orgId, isActive: 'true' } }),
      bkend.get<Alert[]>('/alerts', { params: { orgId, isRead: 'false' } }),
      bkend.get<OptimizationTip[]>('/optimization-tips', { params: { orgId } }).catch(() => [] as OptimizationTip[]),
      bkend.get<Project[]>('/projects', { params: { orgId } }).catch(() => [] as Project[]),
      bkend.get<ProxyLog[]>('/proxy-logs', { params: { orgId, createdAt_gte: thisMonthStart } }).catch(() => [] as ProxyLog[]),
    ])

    // Apply provider filter
    const currentRecords = providerFilter
      ? allCurrentRecords.filter((r) => providerFilter.includes(r.providerType))
      : allCurrentRecords
    const previousRecords = providerFilter
      ? allPreviousRecords.filter((r) => providerFilter.includes(r.providerType))
      : allPreviousRecords

    const currentTotal = currentRecords.reduce((sum, r) => sum + r.cost, 0)
    const previousTotal = previousRecords.reduce((sum, r) => sum + r.cost, 0)
    const proxyCost = proxyLogs.reduce((sum, l) => sum + Number(l.cost), 0)
    const changePercent = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0

    // Forecast
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysSoFar = now.getDate()
    const dailyAverage = daysSoFar > 0 ? currentTotal / daysSoFar : 0
    const projectedMonthly = dailyAverage * daysInMonth
    const daysRemaining = daysInMonth - daysSoFar
    const budgetWarning = budgets.length > 0 && budgets.some((b) => projectedMonthly > b.amount)

    // By provider (merge proxy logs)
    const providerMap = new Map<string, { cost: number; tokenCount: number; requestCount: number }>()
    for (const r of currentRecords) {
      const entry = providerMap.get(r.providerType) || { cost: 0, tokenCount: 0, requestCount: 0 }
      entry.cost += r.cost
      entry.tokenCount += r.totalTokens
      entry.requestCount += r.requestCount
      providerMap.set(r.providerType, entry)
    }
    for (const log of proxyLogs) {
      const entry = providerMap.get(log.providerType) || { cost: 0, tokenCount: 0, requestCount: 0 }
      entry.cost += Number(log.cost)
      entry.tokenCount += log.totalTokens
      entry.requestCount += 1
      providerMap.set(log.providerType, entry)
    }

    // Top models (merge proxy logs)
    const modelMap = new Map<string, { cost: number; tokenCount: number; requests: number }>()
    for (const r of currentRecords) {
      const entry = modelMap.get(r.model) || { cost: 0, tokenCount: 0, requests: 0 }
      entry.cost += r.cost
      entry.tokenCount += r.totalTokens
      entry.requests += r.requestCount
      modelMap.set(r.model, entry)
    }
    for (const log of proxyLogs) {
      const entry = modelMap.get(log.model) || { cost: 0, tokenCount: 0, requests: 0 }
      entry.cost += Number(log.cost)
      entry.tokenCount += log.totalTokens
      entry.requests += 1
      modelMap.set(log.model, entry)
    }

    // By project
    const projectCostMap = new Map<string, number>()
    for (const r of allCurrentRecords) {
      if (r.projectId) {
        projectCostMap.set(r.projectId, (projectCostMap.get(r.projectId) || 0) + r.cost)
      }
    }

    const byProject = projects
      .map((p, i) => ({
        projectId: p.id,
        name: p.name,
        cost: projectCostMap.get(p.id) || 0,
        color: p.color || PROJECT_COLORS[i % PROJECT_COLORS.length],
      }))
      .filter((p) => p.cost > 0)
      .sort((a, b) => b.cost - a.cost)

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

    // Optimization summary
    const pendingTips = tips.filter((t) => t.status === 'pending')
    const sortedTips = [...pendingTips].sort((a, b) => b.potentialSaving - a.potentialSaving)

    const summary: DashboardSummary = {
      totalCost: { current: currentTotal, previous: previousTotal, changePercent, proxyCost },
      forecast: {
        projectedMonthly: Math.round(projectedMonthly * 100) / 100,
        daysRemaining,
        dailyAverage: Math.round(dailyAverage * 100) / 100,
        budgetWarning,
      },
      byProvider: Array.from(providerMap.entries()).map(([type, data]) => ({
        type: type as DashboardSummary['byProvider'][0]['type'],
        ...data,
      })),
      byProject,
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
      optimizationSummary: {
        totalSavings: pendingTips.reduce((sum, t) => sum + t.potentialSaving, 0),
        tipsCount: pendingTips.length,
        topTip: sortedTips[0]?.suggestion,
      },
    }

    return NextResponse.json(summary)
  } catch (err) {
    console.error('[dashboard/summary] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load summary' },
      { status: 500 },
    )
  }
}
