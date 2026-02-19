export interface TimeseriesPoint {
  date: string
  totalCost: number
  totalSaved: number
  requestCount: number
  cacheHits: number
  modelRoutings: number
}

export interface BreakdownItem {
  name: string
  totalCost: number
  totalSaved: number
  requestCount: number
  avgLatencyMs: number
  cacheHitRate: number
}

export type BreakdownType = 'model' | 'provider' | 'key'
// AnalyticsPeriod is defined in analytics.ts and re-exported from @/types
export type { AnalyticsPeriod } from './analytics'
