import type { ProviderType } from './provider'
import type { Alert } from './alert'
import type { BudgetStatus } from './budget'

export interface DashboardSummary {
  totalCost: {
    current: number
    previous: number
    changePercent: number
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
}

export interface ChartDataPoint {
  date: string
  cost: number
  tokens: number
  requests: number
}
