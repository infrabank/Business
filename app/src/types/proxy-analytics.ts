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
export type AnalyticsPeriod = '7d' | '30d' | '90d'
