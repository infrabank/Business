export type AnalyticsEventType =
  | 'page_view'
  | 'feature_use'
  | 'button_click'
  | 'onboarding_step'
  | 'session_start'
  | 'session_end'

export interface AnalyticsEvent {
  id: string
  orgId: string
  userId: string
  type: AnalyticsEventType
  name: string
  metadata: Record<string, unknown>
  sessionId: string
  createdAt: string
}

export interface TrackEvent {
  type: AnalyticsEventType
  name: string
  metadata?: Record<string, unknown>
}

export interface EventBatchPayload {
  events: TrackEvent[]
  sessionId: string
}

export interface AnalyticsSummary {
  dau: number
  wau: number
  mau: number
  avgSessionDuration: number
  totalEvents: number
  dauChange: number
  wauChange: number
  mauChange: number
  dailyUsers: DailyUserCount[]
}

export interface DailyUserCount {
  date: string
  count: number
}

export interface PageStat {
  path: string
  views: number
  uniqueUsers: number
  avgDuration: number
}

export interface FeatureStat {
  name: string
  usageCount: number
  uniqueUsers: number
}

export interface FunnelStep {
  step: string
  label: string
  count: number
  rate: number
  dropoff: number
}

export interface RetentionCohort {
  cohortWeek: string
  cohortSize: number
  retention: number[]
}

export type AnalyticsPeriod = '7d' | '30d' | '90d'
