import type { ProviderType } from './provider'

export type ReportFormat = 'csv' | 'json' | 'pdf'
export type ReportPeriodPreset = 'this-month' | 'last-month' | '7d' | '30d' | '90d' | 'custom'

export interface MonthlyReport {
  month: string          // "2026-02"
  label: string          // "2026년 2월"
  totalCost: number
  totalTokens: number
  totalRequests: number
  providerCount: number
  modelCount: number
  isCurrentMonth: boolean
}

export interface ReportSummary {
  period: { from: string; to: string }
  overview: {
    totalCost: number
    totalTokens: number
    totalRequests: number
    dailyAverage: number
    previousPeriodCost: number
    changePercent: number
  }
  byProvider: {
    type: ProviderType
    cost: number
    tokenCount: number
    requestCount: number
    percentage: number
  }[]
  byModel: {
    model: string
    provider: ProviderType
    cost: number
    tokenCount: number
    requestCount: number
  }[]
  byProject: {
    projectId: string
    name: string
    cost: number
    percentage: number
  }[]
  dailyTrend: {
    date: string
    cost: number
    tokens: number
    requests: number
  }[]
}

export interface ExportOptions {
  orgId: string
  format: ReportFormat
  from: string
  to: string
}
