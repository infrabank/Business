import type { DashboardSummary, ChartDataPoint } from '@/types/dashboard'

export function generateMockDashboardSummary(): DashboardSummary {
  return {
    totalCost: {
      current: 2847.53,
      previous: 3215.82,
      changePercent: -11.5,
    },
    byProvider: [
      { type: 'openai', cost: 1423.76, tokenCount: 45_200_000, requestCount: 12400 },
      { type: 'anthropic', cost: 998.42, tokenCount: 28_100_000, requestCount: 8200 },
      { type: 'google', cost: 425.35, tokenCount: 52_300_000, requestCount: 15800 },
    ],
    byProject: [
      { projectId: '1', name: 'Production API', cost: 1842.30, color: '#3B82F6' },
      { projectId: '2', name: 'Development', cost: 653.18, color: '#10B981' },
      { projectId: '3', name: 'Testing', cost: 352.05, color: '#F59E0B' },
    ],
    topModels: [
      { model: 'gpt-4o', cost: 1100.50, tokenCount: 12_000_000, avgCostPerRequest: 0.089 },
      { model: 'claude-sonnet-4-5', cost: 785.20, tokenCount: 8_500_000, avgCostPerRequest: 0.096 },
      { model: 'gpt-4o-mini', cost: 323.26, tokenCount: 33_200_000, avgCostPerRequest: 0.003 },
      { model: 'gemini-2.0-flash', cost: 210.15, tokenCount: 48_000_000, avgCostPerRequest: 0.001 },
      { model: 'claude-haiku-4-5', cost: 213.22, tokenCount: 19_600_000, avgCostPerRequest: 0.011 },
    ],
    budgetStatus: [
      { budgetId: '1', name: 'Total Monthly', amount: 5000, spent: 2847.53, percentage: 56.9 },
      { budgetId: '2', name: 'Production', amount: 3000, spent: 1842.30, percentage: 61.4 },
    ],
    recentAlerts: [
      {
        id: '1', orgId: '1', type: 'budget_warning',
        title: 'Production budget at 61%',
        message: 'Production project has used 61.4% of the $3,000 monthly budget.',
        isRead: false, sentAt: new Date().toISOString(),
      },
      {
        id: '2', orgId: '1', type: 'optimization',
        title: 'Cost optimization available',
        message: 'Switching gpt-4o to gpt-4o-mini for simple tasks could save ~$230/month.',
        isRead: false, sentAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  }
}

export function generateMockChartData(days: number): ChartDataPoint[] {
  const data: ChartDataPoint[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const baseCost = 80 + Math.random() * 40
    const weekday = date.getDay()
    const multiplier = weekday === 0 || weekday === 6 ? 0.3 : 1

    data.push({
      date: date.toISOString().split('T')[0],
      cost: Math.round(baseCost * multiplier * 100) / 100,
      tokens: Math.floor(baseCost * multiplier * 10000 + Math.random() * 50000),
      requests: Math.floor(baseCost * multiplier * 5 + Math.random() * 100),
    })
  }
  return data
}
