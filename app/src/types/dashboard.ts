import type { ProviderType } from './provider'
import type { Alert } from './alert'
import type { BudgetStatus } from './budget'

export type DashboardPeriod = '7d' | '30d' | '90d'

export interface DashboardSummary {
  totalCost: {
    current: number
    previous: number
    changePercent: number
  }
  forecast: {
    projectedMonthly: number
    daysRemaining: number
    dailyAverage: number
    budgetWarning: boolean
  }
  byProvider: {
    type: ProviderType
    cost: number
    tokenCount: number
    requestCount: number
  }[]
  byProject: {
    projectId: string
    name: string
    cost: number
    color: string
  }[]
  topModels: {
    model: string
    cost: number
    tokenCount: number
    avgCostPerRequest: number
  }[]
  budgetStatus: BudgetStatus[]
  recentAlerts: Alert[]
  optimizationSummary: {
    totalSavings: number
    tipsCount: number
    topTip?: string
  }
}

export interface ChartDataPoint {
  date: string
  cost: number
  tokens: number
  requests: number
  previousCost?: number
}
