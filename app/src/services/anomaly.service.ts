import { bkend } from '@/lib/bkend'
import type { Alert } from '@/types'
import type { AnomalyDetectionSettings, AnomalyEvent, AnomalySeverity } from '@/types/anomaly'
import { SENSITIVITY_THRESHOLDS, DEFAULT_ANOMALY_SETTINGS } from '@/types/anomaly'
import { getDailyUsageStats, getHourlyUsageStats, getModelUsageStats } from './anomaly-stats.service'
import { dispatchNotification } from './notification.service'

// ---- Settings CRUD ----

export async function getSettings(orgId: string, token: string): Promise<AnomalyDetectionSettings> {
  const results = await bkend.get<AnomalyDetectionSettings[]>('/anomaly-settings', {
    token,
    params: { orgId },
  })
  if (results.length > 0) return results[0]

  return bkend.post<AnomalyDetectionSettings>('/anomaly-settings', {
    orgId,
    ...DEFAULT_ANOMALY_SETTINGS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { token })
}

export async function updateSettings(
  settingsId: string,
  updates: Partial<Pick<AnomalyDetectionSettings, 'enabled' | 'sensitivity' | 'dailyCostDetection' | 'hourlySpikeDetection' | 'modelAnomalyDetection' | 'suppressedPatterns'>>,
  token: string,
): Promise<AnomalyDetectionSettings> {
  return bkend.patch<AnomalyDetectionSettings>(`/anomaly-settings/${settingsId}`, {
    ...updates,
    updatedAt: new Date().toISOString(),
  }, { token })
}

// ---- Statistics Helpers ----

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const sumSq = values.reduce((s, v) => s + (v - avg) ** 2, 0)
  return Math.sqrt(sumSq / (values.length - 1))
}

function calcZScore(value: number, avg: number, sd: number): number {
  if (sd === 0) return 0
  return (value - avg) / sd
}

function getSeverity(zScore: number, threshold: number): AnomalySeverity {
  return zScore >= threshold * 2 ? 'critical' : 'warning'
}

// ---- Core Detection ----

export async function detectAnomalies(
  orgId: string,
  token: string,
): Promise<AnomalyEvent[]> {
  const settings = await getSettings(orgId, token)
  if (!settings.enabled) return []

  const thresholds = SENSITIVITY_THRESHOLDS[settings.sensitivity]
  const events: AnomalyEvent[] = []

  // Daily cost anomaly (Z-score over 14-day window)
  if (settings.dailyCostDetection) {
    const dailyStats = await getDailyUsageStats(orgId, 14, token)
    if (dailyStats.length >= 3) {
      const costs = dailyStats.map((d) => d.totalCost)
      const today = costs[costs.length - 1]
      const historical = costs.slice(0, -1)
      const avg = mean(historical)
      const sd = stdDev(historical)
      const z = calcZScore(today, avg, sd)

      if (z > thresholds.zScore) {
        events.push({
          id: '',
          orgId,
          type: 'daily_cost_spike',
          severity: getSeverity(z, thresholds.zScore),
          detectedValue: today,
          baselineValue: avg,
          threshold: thresholds.zScore,
          zScore: Math.round(z * 100) / 100,
          detectedAt: new Date().toISOString(),
        })
      }
    }
  }

  // Hourly spike (last hour vs avg of previous 24h)
  if (settings.hourlySpikeDetection) {
    const hourlyStats = await getHourlyUsageStats(orgId, 48, token)
    if (hourlyStats.length >= 2) {
      const latest = hourlyStats[hourlyStats.length - 1]
      const previous = hourlyStats.slice(0, -1)
      const avgHourly = mean(previous.map((h) => h.totalCost))

      if (avgHourly > 0 && latest.totalCost >= avgHourly * thresholds.hourlyMultiplier) {
        const multiplier = latest.totalCost / avgHourly
        events.push({
          id: '',
          orgId,
          type: 'hourly_spike',
          severity: multiplier >= thresholds.hourlyMultiplier * 2 ? 'critical' : 'warning',
          detectedValue: latest.totalCost,
          baselineValue: avgHourly,
          threshold: thresholds.hourlyMultiplier,
          zScore: 0,
          detectedAt: new Date().toISOString(),
          metadata: { hour: latest.hour, multiplier: Math.round(multiplier * 10) / 10 },
        })
      }
    }
  }

  // Model anomaly
  if (settings.modelAnomalyDetection) {
    const recentModels = await getModelUsageStats(orgId, 1, token)
    const historicalModels = await getModelUsageStats(orgId, 14, token)

    for (const recent of recentModels) {
      const hist = historicalModels.find((m) => m.model === recent.model)
      if (!hist) continue

      const dailyAvgCost = hist.totalCost / 14
      if (dailyAvgCost > 0 && recent.totalCost >= dailyAvgCost * thresholds.modelMultiplier) {
        events.push({
          id: '',
          orgId,
          type: 'model_anomaly',
          severity: 'warning',
          detectedValue: recent.totalCost,
          baselineValue: dailyAvgCost,
          threshold: thresholds.modelMultiplier,
          zScore: 0,
          model: recent.model,
          detectedAt: new Date().toISOString(),
        })
      }

      // Dormant model activation
      if (hist.daysSinceLastUsed >= 7 && recent.totalCost > 0) {
        events.push({
          id: '',
          orgId,
          type: 'dormant_model_activation',
          severity: 'warning',
          detectedValue: recent.totalCost,
          baselineValue: 0,
          threshold: 7,
          zScore: 0,
          model: recent.model,
          detectedAt: new Date().toISOString(),
          metadata: { daysDormant: hist.daysSinceLastUsed },
        })
      }
    }
  }

  // Filter suppressed patterns
  const suppressed = new Set(settings.suppressedPatterns)
  const filtered = events.filter((e) => {
    const patternKey = `${e.type}:${e.model ?? 'all'}`
    return !suppressed.has(patternKey)
  })

  // Deduplicate: no repeat alerts for same type within 24h
  const recentEvents = await bkend.get<AnomalyEvent[]>('/anomaly-events', {
    token,
    params: { orgId, detectedAt_gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  })
  const recentTypes = new Set(recentEvents.map((e) => `${e.type}:${e.model ?? ''}`))

  const newEvents: AnomalyEvent[] = []
  for (const event of filtered) {
    const key = `${event.type}:${event.model ?? ''}`
    if (recentTypes.has(key)) continue

    const saved = await bkend.post<AnomalyEvent>('/anomaly-events', { ...event } as Record<string, unknown>, { token })

    const alert = await bkend.post<Alert>('/alerts', {
      orgId,
      type: 'anomaly' as const,
      title: getAlertTitle(event),
      message: getAlertMessage(event),
      metadata: {
        anomalyEventId: saved.id,
        anomalyType: event.type,
        detectedValue: event.detectedValue,
        baselineValue: event.baselineValue,
        severity: event.severity,
        model: event.model,
      },
      isRead: false,
      sentAt: new Date().toISOString(),
    }, { token })

    await bkend.patch(`/anomaly-events/${saved.id}`, { alertId: alert.id }, { token })
    saved.alertId = alert.id
    newEvents.push(saved)

    // Dispatch to external notification channels
    try {
      await dispatchNotification(alert, orgId, token)
    } catch {
      // fire-and-forget: notification failure should not block anomaly detection
    }
  }

  return newEvents
}

// ---- Alert Message Helpers ----

function getAlertTitle(event: AnomalyEvent): string {
  switch (event.type) {
    case 'daily_cost_spike':
      return `일별 비용 이상 감지 (Z-score: ${event.zScore})`
    case 'hourly_spike':
      return '시간별 비용 스파이크 감지'
    case 'model_anomaly':
      return `모델 이상 사용 감지: ${event.model}`
    case 'dormant_model_activation':
      return `미사용 모델 활성화: ${event.model}`
  }
}

function getAlertMessage(event: AnomalyEvent): string {
  const detected = `$${event.detectedValue.toFixed(2)}`
  const baseline = `$${event.baselineValue.toFixed(2)}`

  switch (event.type) {
    case 'daily_cost_spike':
      return `오늘 비용 ${detected}이 최근 14일 평균 ${baseline} 대비 Z-score ${event.zScore}로 비정상적으로 높습니다.`
    case 'hourly_spike':
      return `최근 1시간 비용 ${detected}이 평균 ${baseline} 대비 ${(event.metadata?.multiplier as number)?.toFixed(1) ?? '?'}배 급증했습니다.`
    case 'model_anomaly':
      return `${event.model} 모델의 오늘 비용 ${detected}이 일 평균 ${baseline} 대비 ${event.threshold}배 이상 증가했습니다.`
    case 'dormant_model_activation':
      return `${event.model} 모델이 ${(event.metadata?.daysDormant as number) ?? 7}일 간 미사용 후 갑자기 ${detected} 비용이 발생했습니다.`
  }
}

// ---- History ----

export async function getAnomalyHistory(
  orgId: string,
  token: string,
  days: number = 30,
): Promise<AnomalyEvent[]> {
  const from = new Date()
  from.setDate(from.getDate() - days)
  return bkend.get<AnomalyEvent[]>('/anomaly-events', {
    token,
    params: {
      orgId,
      detectedAt_gte: from.toISOString(),
      _sort: 'detectedAt',
      _order: 'desc',
    },
  })
}

// ---- Suppress ----

export async function suppressPattern(
  orgId: string,
  pattern: string,
  token: string,
): Promise<AnomalyDetectionSettings> {
  const settings = await getSettings(orgId, token)
  const updated = [...new Set([...settings.suppressedPatterns, pattern])]
  return updateSettings(settings.id, { suppressedPatterns: updated }, token)
}
