import { bkend } from '@/lib/bkend'
import type { UsageRecord, Project } from '@/types'
import type { ProviderType } from '@/types/provider'
import type { MonthlyReport, ReportSummary } from '@/types/report'

const MONTH_LABELS: Record<string, string> = {
  '01': '1월', '02': '2월', '03': '3월', '04': '4월',
  '05': '5월', '06': '6월', '07': '7월', '08': '8월',
  '09': '9월', '10': '10월', '11': '11월', '12': '12월',
}

// ---- Monthly Report List ----

export async function getMonthlyReports(
  orgId: string,
  token: string,
  maxMonths: number,
): Promise<MonthlyReport[]> {
  const records = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: { orgId },
  })

  const monthMap = new Map<string, {
    cost: number; tokens: number; requests: number
    providers: Set<string>; models: Set<string>
  }>()

  for (const r of records) {
    const month = r.date.substring(0, 7) // "YYYY-MM"
    const entry = monthMap.get(month) || {
      cost: 0, tokens: 0, requests: 0,
      providers: new Set<string>(), models: new Set<string>(),
    }
    entry.cost += r.cost
    entry.tokens += r.totalTokens
    entry.requests += r.requestCount
    entry.providers.add(r.providerType)
    entry.models.add(r.model)
    monthMap.set(month, entry)
  }

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const reports: MonthlyReport[] = Array.from(monthMap.entries())
    .map(([month, data]) => {
      const [year, mm] = month.split('-')
      return {
        month,
        label: `${year}년 ${MONTH_LABELS[mm] || mm}`,
        totalCost: Math.round(data.cost * 100) / 100,
        totalTokens: data.tokens,
        totalRequests: data.requests,
        providerCount: data.providers.size,
        modelCount: data.models.size,
        isCurrentMonth: month === currentMonth,
      }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, maxMonths)

  return reports
}

// ---- Report Summary ----

export async function getReportSummary(
  orgId: string,
  from: string,
  to: string,
  token: string,
): Promise<ReportSummary> {
  // Fetch current period records
  const [records, projects] = await Promise.all([
    bkend.get<UsageRecord[]>('/usage-records', {
      token,
      params: { orgId, date_gte: from, date_lte: to },
    }),
    bkend.get<Project[]>('/projects', { token, params: { orgId } }).catch(() => [] as Project[]),
  ])

  // Fetch previous period for comparison
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const periodDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const prevTo = new Date(fromDate)
  prevTo.setDate(prevTo.getDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setDate(prevFrom.getDate() - periodDays + 1)

  const prevRecords = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: {
      orgId,
      date_gte: prevFrom.toISOString().split('T')[0],
      date_lte: prevTo.toISOString().split('T')[0],
    },
  }).catch(() => [] as UsageRecord[])

  // Overview
  const totalCost = records.reduce((sum, r) => sum + r.cost, 0)
  const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0)
  const totalRequests = records.reduce((sum, r) => sum + r.requestCount, 0)
  const dailyAverage = periodDays > 0 ? totalCost / periodDays : 0
  const previousPeriodCost = prevRecords.reduce((sum, r) => sum + r.cost, 0)
  const changePercent = previousPeriodCost > 0
    ? ((totalCost - previousPeriodCost) / previousPeriodCost) * 100
    : 0

  // By Provider
  const providerMap = new Map<string, { cost: number; tokenCount: number; requestCount: number }>()
  for (const r of records) {
    const entry = providerMap.get(r.providerType) || { cost: 0, tokenCount: 0, requestCount: 0 }
    entry.cost += r.cost
    entry.tokenCount += r.totalTokens
    entry.requestCount += r.requestCount
    providerMap.set(r.providerType, entry)
  }
  const byProvider = Array.from(providerMap.entries())
    .map(([type, data]) => ({
      type: type as ProviderType,
      ...data,
      percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost)

  // By Model (Top 10)
  const modelMap = new Map<string, { provider: string; cost: number; tokenCount: number; requestCount: number }>()
  for (const r of records) {
    const entry = modelMap.get(r.model) || { provider: r.providerType, cost: 0, tokenCount: 0, requestCount: 0 }
    entry.cost += r.cost
    entry.tokenCount += r.totalTokens
    entry.requestCount += r.requestCount
    modelMap.set(r.model, entry)
  }
  const byModel = Array.from(modelMap.entries())
    .map(([model, data]) => ({
      model,
      provider: data.provider as ProviderType,
      cost: data.cost,
      tokenCount: data.tokenCount,
      requestCount: data.requestCount,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)

  // By Project
  const projectCostMap = new Map<string, number>()
  for (const r of records) {
    if (r.projectId) {
      projectCostMap.set(r.projectId, (projectCostMap.get(r.projectId) || 0) + r.cost)
    }
  }
  const byProject = projects
    .map((p) => ({
      projectId: p.id,
      name: p.name,
      cost: projectCostMap.get(p.id) || 0,
      percentage: totalCost > 0 ? ((projectCostMap.get(p.id) || 0) / totalCost) * 100 : 0,
    }))
    .filter((p) => p.cost > 0)
    .sort((a, b) => b.cost - a.cost)

  // Daily Trend
  const dateMap = new Map<string, { cost: number; tokens: number; requests: number }>()
  for (const r of records) {
    const date = r.date.split('T')[0]
    const entry = dateMap.get(date) || { cost: 0, tokens: 0, requests: 0 }
    entry.cost += r.cost
    entry.tokens += r.totalTokens
    entry.requests += r.requestCount
    dateMap.set(date, entry)
  }
  const dailyTrend = Array.from(dateMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    period: { from, to },
    overview: {
      totalCost: Math.round(totalCost * 100) / 100,
      totalTokens,
      totalRequests,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      previousPeriodCost: Math.round(previousPeriodCost * 100) / 100,
      changePercent: Math.round(changePercent * 10) / 10,
    },
    byProvider,
    byModel,
    byProject,
    dailyTrend,
  }
}

// ---- CSV Export ----

function escapeCsvCell(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function generateCsv(records: UsageRecord[]): string {
  const BOM = '\uFEFF'
  const header = 'Date,Provider,Model,Project,Input Tokens,Output Tokens,Total Tokens,Cost,Requests'
  const rows = records.map((r) =>
    [
      r.date.split('T')[0],
      escapeCsvCell(r.providerType),
      escapeCsvCell(r.model),
      r.projectId || '',
      r.inputTokens,
      r.outputTokens,
      r.totalTokens,
      r.cost.toFixed(4),
      r.requestCount,
    ].join(',')
  )
  return BOM + [header, ...rows].join('\n')
}

// ---- JSON Export ----

export function generateJson(
  summary: ReportSummary,
  records: UsageRecord[],
): string {
  return JSON.stringify({ summary, records }, null, 2)
}
