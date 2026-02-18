import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { UsageRecord, Project } from '@/types'
import type { ProjectSummary } from '@/types/project'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params
  const orgId = req.nextUrl.searchParams.get('orgId')
  const period = req.nextUrl.searchParams.get('period') || '30d'

  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    // Calculate date range
    const now = new Date()
    const daysBack = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Previous period for comparison
    const prevStart = new Date(startDate)
    prevStart.setDate(prevStart.getDate() - daysBack)
    const prevStartStr = prevStart.toISOString().split('T')[0]
    const prevEndStr = startDateStr

    // Fetch current and previous period records + project info
    const [project, currentRecords, previousRecords] = await Promise.all([
      bkend.get<Project>(`/projects/${projectId}`),
      bkend.get<UsageRecord[]>('/usage-records', {
        params: { orgId, projectId, date_gte: startDateStr },
      }),
      bkend.get<UsageRecord[]>('/usage-records', {
        params: { orgId, projectId, date_gte: prevStartStr, date_lte: prevEndStr },
      }),
    ])

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const totalCost = currentRecords.reduce((sum, r) => sum + r.cost, 0)
    const totalTokens = currentRecords.reduce((sum, r) => sum + r.totalTokens, 0)
    const totalRequests = currentRecords.reduce((sum, r) => sum + r.requestCount, 0)
    const previousTotal = previousRecords.reduce((sum, r) => sum + r.cost, 0)
    const costChange = previousTotal > 0
      ? ((totalCost - previousTotal) / previousTotal) * 100
      : 0

    // By provider
    const providerMap = new Map<string, { cost: number; tokenCount: number; requestCount: number }>()
    for (const r of currentRecords) {
      const entry = providerMap.get(r.providerType) || { cost: 0, tokenCount: 0, requestCount: 0 }
      entry.cost += r.cost
      entry.tokenCount += r.totalTokens
      entry.requestCount += r.requestCount
      providerMap.set(r.providerType, entry)
    }

    // By model
    const modelMap = new Map<string, { cost: number; tokenCount: number }>()
    for (const r of currentRecords) {
      const entry = modelMap.get(r.model) || { cost: 0, tokenCount: 0 }
      entry.cost += r.cost
      entry.tokenCount += r.totalTokens
      modelMap.set(r.model, entry)
    }

    // Daily costs
    const dailyMap = new Map<string, number>()
    for (const r of currentRecords) {
      dailyMap.set(r.date, (dailyMap.get(r.date) || 0) + r.cost)
    }
    const dailyCosts = Array.from(dailyMap.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Recent records (last 10)
    const recentRecords = [...currentRecords]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        model: r.model,
        providerType: r.providerType,
        cost: r.cost,
        totalTokens: r.totalTokens,
        requestCount: r.requestCount,
        date: r.date,
      }))

    const summary: ProjectSummary = {
      totalCost,
      totalTokens,
      totalRequests,
      costChange,
      byProvider: Array.from(providerMap.entries()).map(([type, data]) => ({
        type: type as ProjectSummary['byProvider'][0]['type'],
        ...data,
      })),
      byModel: Array.from(modelMap.entries())
        .map(([model, data]) => ({ model, ...data }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5),
      dailyCosts,
      recentRecords,
    }

    return NextResponse.json(summary)
  } catch (err) {
    console.error('[projects/summary] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load project summary' },
      { status: 500 },
    )
  }
}
