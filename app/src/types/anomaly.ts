// --- Sensitivity Configuration ---
export type AnomalySensitivity = 'low' | 'medium' | 'high'

export const SENSITIVITY_THRESHOLDS: Record<AnomalySensitivity, {
  zScore: number
  hourlyMultiplier: number
  modelMultiplier: number
}> = {
  low:    { zScore: 3.0, hourlyMultiplier: 5, modelMultiplier: 10 },
  medium: { zScore: 2.0, hourlyMultiplier: 3, modelMultiplier: 5 },
  high:   { zScore: 1.5, hourlyMultiplier: 2, modelMultiplier: 3 },
}

// --- Detection Settings (per org) ---
export interface AnomalyDetectionSettings {
  id: string
  orgId: string
  enabled: boolean
  sensitivity: AnomalySensitivity
  dailyCostDetection: boolean
  hourlySpikeDetection: boolean
  modelAnomalyDetection: boolean
  suppressedPatterns: string[]
  createdAt: string
  updatedAt: string
}

// --- Detection Event ---
export type AnomalyType =
  | 'daily_cost_spike'
  | 'hourly_spike'
  | 'model_anomaly'
  | 'dormant_model_activation'

export type AnomalySeverity = 'warning' | 'critical'

export interface AnomalyEvent {
  id: string
  orgId: string
  alertId?: string
  type: AnomalyType
  severity: AnomalySeverity
  detectedValue: number
  baselineValue: number
  threshold: number
  zScore: number
  model?: string
  detectedAt: string
  metadata?: Record<string, unknown>
}

// --- Stats helpers ---
export interface DailyUsageStats {
  date: string
  totalCost: number
  requestCount: number
}

export interface HourlyUsageStats {
  hour: string
  totalCost: number
}

export interface ModelUsageStats {
  model: string
  totalCost: number
  requestCount: number
  daysSinceLastUsed: number
}

// --- Default settings factory ---
export const DEFAULT_ANOMALY_SETTINGS: Omit<AnomalyDetectionSettings, 'id' | 'orgId' | 'createdAt' | 'updatedAt'> = {
  enabled: true,
  sensitivity: 'medium',
  dailyCostDetection: true,
  hourlySpikeDetection: true,
  modelAnomalyDetection: true,
  suppressedPatterns: [],
}
