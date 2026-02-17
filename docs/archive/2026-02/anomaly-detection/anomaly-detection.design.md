# Design: anomaly-detection

> 이상 지출 자동 감지 - 비정상적 비용 급증, 토큰 스파이크, 사용 패턴 이탈을 실시간 탐지하고 알림

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Vercel Cron (매 시간)                                           │
│  GET /api/cron/detect-anomalies?secret=CRON_SECRET              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  anomaly.service.ts                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ Daily Cost Check │  │ Hourly Spike     │  │ Model Anomaly  │ │
│  │ (Z-score 14일)   │  │ (24h 비교)        │  │ (5x 증가)      │ │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘ │
│           └──────────┬─────────┴────────────────────┘           │
│                      ▼                                           │
│           anomaly-stats.service.ts                               │
│           (usage-records 집계)                                    │
└──────────────────────┬───────────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
     ┌──────────────┐  ┌──────────────┐
     │ anomaly-events│  │ alerts       │
     │ (bkend.ai)   │  │ (type=anomaly)│
     └──────────────┘  └──────────────┘
              │                 │
              ▼                 ▼
     ┌───────────────────────────────────────┐
     │  Dashboard Widget + Alerts Page       │
     │  - AnomalyStatCard                    │
     │  - CostTrendChart (anomaly markers)   │
     │  - AnomalySettingsPanel               │
     │  - AnomalyDetailPanel                 │
     └───────────────────────────────────────┘
```

## 2. Data Model

### 2.1 New Types (`src/types/anomaly.ts`)

```typescript
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
  suppressedPatterns: string[]       // AnomalyEvent IDs to ignore
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
  alertId?: string                   // linked Alert record
  type: AnomalyType
  severity: AnomalySeverity
  detectedValue: number              // actual observed value
  baselineValue: number              // moving average / expected value
  threshold: number                  // threshold used for detection
  zScore: number                     // calculated Z-score (0 for non-Z-score checks)
  model?: string                     // for model_anomaly / dormant_model_activation
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
  hour: string                       // ISO format
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
```

### 2.2 Type Exports (`src/types/index.ts`)

Add line:
```typescript
export type { AnomalyDetectionSettings, AnomalyEvent, AnomalyType, AnomalySeverity, AnomalySensitivity } from './anomaly'
```

### 2.3 bkend.ai Collections

| Collection | Purpose | Index Fields |
|-----------|---------|-------------|
| `anomaly-settings` | Org detection settings (1 per org) | `orgId` (unique) |
| `anomaly-events` | Detection history | `orgId`, `detectedAt`, `type` |

No schema migration needed - bkend.ai is schemaless.

## 3. Service Layer

### 3.1 Stats Service (`src/services/anomaly-stats.service.ts`)

Aggregates usage-records for the detection service. Follows the same pattern as `optimization.service.ts`.

```typescript
import { bkend } from '@/lib/bkend'
import type { UsageRecord } from '@/types'
import type { DailyUsageStats, HourlyUsageStats, ModelUsageStats } from '@/types/anomaly'

/**
 * Get daily cost totals for the last N days.
 * Groups usage-records by date and sums cost.
 */
export async function getDailyUsageStats(
  orgId: string,
  days: number,
  token: string,
): Promise<DailyUsageStats[]> {
  const from = new Date()
  from.setDate(from.getDate() - days)
  const records = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: { orgId, date_gte: from.toISOString().split('T')[0] },
  })

  const byDate = new Map<string, { cost: number; requests: number }>()
  for (const r of records) {
    const key = r.date
    const entry = byDate.get(key) ?? { cost: 0, requests: 0 }
    entry.cost += r.cost
    entry.requests += r.requestCount
    byDate.set(key, entry)
  }

  return Array.from(byDate.entries())
    .map(([date, v]) => ({ date, totalCost: v.cost, requestCount: v.requests }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get hourly cost totals for the last N hours.
 */
export async function getHourlyUsageStats(
  orgId: string,
  hours: number,
  token: string,
): Promise<HourlyUsageStats[]> {
  const from = new Date()
  from.setHours(from.getHours() - hours)
  const records = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: { orgId, createdAt_gte: from.toISOString() },
  })

  const byHour = new Map<string, number>()
  for (const r of records) {
    const hour = r.createdAt.slice(0, 13) // "YYYY-MM-DDTHH"
    byHour.set(hour, (byHour.get(hour) ?? 0) + r.cost)
  }

  return Array.from(byHour.entries())
    .map(([hour, totalCost]) => ({ hour, totalCost }))
    .sort((a, b) => a.hour.localeCompare(b.hour))
}

/**
 * Get per-model usage summary for the last N days.
 */
export async function getModelUsageStats(
  orgId: string,
  days: number,
  token: string,
): Promise<ModelUsageStats[]> {
  const from = new Date()
  from.setDate(from.getDate() - days)
  const records = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: { orgId, date_gte: from.toISOString().split('T')[0] },
  })

  const byModel = new Map<string, { cost: number; requests: number; lastDate: string }>()
  for (const r of records) {
    const entry = byModel.get(r.model) ?? { cost: 0, requests: 0, lastDate: '' }
    entry.cost += r.cost
    entry.requests += r.requestCount
    if (r.date > entry.lastDate) entry.lastDate = r.date
    byModel.set(r.model, entry)
  }

  const today = new Date()
  return Array.from(byModel.entries()).map(([model, v]) => ({
    model,
    totalCost: v.cost,
    requestCount: v.requests,
    daysSinceLastUsed: Math.floor(
      (today.getTime() - new Date(v.lastDate).getTime()) / (1000 * 60 * 60 * 24)
    ),
  }))
}
```

### 3.2 Detection Service (`src/services/anomaly.service.ts`)

Core anomaly detection logic. Pattern follows `budget.service.ts` (check thresholds → create alerts).

```typescript
import { bkend } from '@/lib/bkend'
import type { Alert, AnomalyDetectionSettings, AnomalyEvent, AnomalySeverity } from '@/types'
import { SENSITIVITY_THRESHOLDS, DEFAULT_ANOMALY_SETTINGS } from '@/types/anomaly'
import { getDailyUsageStats, getHourlyUsageStats, getModelUsageStats } from './anomaly-stats.service'

// ---- Settings CRUD ----

export async function getSettings(orgId: string, token: string): Promise<AnomalyDetectionSettings> {
  const results = await bkend.get<AnomalyDetectionSettings[]>('/anomaly-settings', {
    token,
    params: { orgId },
  })
  if (results.length > 0) return results[0]

  // Create default settings on first access
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
  // critical if Z-score exceeds 2x the threshold
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

  // FR-01a: Daily cost anomaly (Z-score over 14-day window)
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
          id: '',  // assigned by bkend
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

  // FR-01b: Hourly spike (last hour vs avg of previous 24h)
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

  // FR-01c: Model anomaly (any model cost 5x+ above its 14-day average)
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

      // FR-01d: Dormant model activation (7+ days unused, now active)
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

    // Save event
    const saved = await bkend.post<AnomalyEvent>('/anomaly-events', event, { token })

    // Create linked alert
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

    // Link alert back to event
    await bkend.patch(`/anomaly-events/${saved.id}`, { alertId: alert.id }, { token })
    saved.alertId = alert.id
    newEvents.push(saved)
  }

  return newEvents
}

// ---- Alert Message Helpers ----

function getAlertTitle(event: AnomalyEvent): string {
  switch (event.type) {
    case 'daily_cost_spike':
      return `일별 비용 이상 감지 (Z-score: ${event.zScore})`
    case 'hourly_spike':
      return `시간별 비용 스파이크 감지`
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
```

## 4. API Routes

### 4.1 Cron: Detect Anomalies (`src/app/api/cron/detect-anomalies/route.ts`)

Pattern: identical to `reconcile-budgets/route.ts`.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { bkendService } from '@/lib/bkend'
import { detectAnomalies } from '@/services/anomaly.service'

interface OrgRecord {
  id: string
}

/**
 * GET /api/cron/detect-anomalies?secret=CRON_SECRET
 * Hourly cron: runs anomaly detection for all organizations.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const orgs = await bkendService.get<OrgRecord[]>('/organizations')
    let detected = 0
    let failed = 0

    for (const org of orgs) {
      try {
        const events = await detectAnomalies(org.id, '')
        detected += events.length
      } catch {
        failed++
      }
    }

    return NextResponse.json({ ok: true, detected, failed, orgs: orgs.length })
  } catch (err) {
    return NextResponse.json(
      { error: 'Anomaly detection failed', detail: String(err) },
      { status: 500 },
    )
  }
}
```

### 4.2 Settings API (`src/app/api/anomaly/settings/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getMe } from '@/lib/auth'
import { getSettings, updateSettings } from '@/services/anomaly.service'

export async function GET(req: NextRequest) {
  const user = await getMe(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const settings = await getSettings(orgId, token)
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const user = await getMe(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { settingsId, ...updates } = body

  if (!settingsId) return NextResponse.json({ error: 'settingsId required' }, { status: 400 })

  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const settings = await updateSettings(settingsId, updates, token)
  return NextResponse.json(settings)
}
```

### 4.3 History API (`src/app/api/anomaly/history/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getMe } from '@/lib/auth'
import { getAnomalyHistory } from '@/services/anomaly.service'

export async function GET(req: NextRequest) {
  const user = await getMe(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const days = Number(req.nextUrl.searchParams.get('days') ?? '30')
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const events = await getAnomalyHistory(orgId, token, days)
  return NextResponse.json(events)
}
```

### 4.4 Suppress API (`src/app/api/anomaly/suppress/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getMe } from '@/lib/auth'
import { suppressPattern } from '@/services/anomaly.service'

export async function POST(req: NextRequest) {
  const user = await getMe(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, pattern } = await req.json()
  if (!orgId || !pattern) {
    return NextResponse.json({ error: 'orgId and pattern required' }, { status: 400 })
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const settings = await suppressPattern(orgId, pattern, token)
  return NextResponse.json(settings)
}
```

## 5. Frontend Hooks

### 5.1 Anomaly Settings Hook (`src/features/anomaly/hooks/useAnomalySettings.ts`)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AnomalyDetectionSettings, AnomalySensitivity } from '@/types/anomaly'

export function useAnomalySettings(orgId?: string | null) {
  const [settings, setSettings] = useState<AnomalyDetectionSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/anomaly/settings?orgId=${orgId}`)
      if (res.ok) setSettings(await res.json())
    } catch {
      setSettings(null)
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const updateSettings = useCallback(async (
    updates: Partial<Pick<AnomalyDetectionSettings, 'enabled' | 'sensitivity' | 'dailyCostDetection' | 'hourlySpikeDetection' | 'modelAnomalyDetection'>>
  ) => {
    if (!settings) return
    // Optimistic update
    setSettings((prev) => prev ? { ...prev, ...updates } : prev)
    try {
      const res = await fetch('/api/anomaly/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingsId: settings.id, ...updates }),
      })
      if (res.ok) setSettings(await res.json())
    } catch {
      // Revert on failure
      fetchSettings()
    }
  }, [settings, fetchSettings])

  return { settings, isLoading, updateSettings, refetch: fetchSettings }
}
```

### 5.2 Anomaly History Hook (`src/features/anomaly/hooks/useAnomalyHistory.ts`)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AnomalyEvent } from '@/types/anomaly'

export function useAnomalyHistory(orgId?: string | null, days: number = 30) {
  const [events, setEvents] = useState<AnomalyEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/anomaly/history?orgId=${orgId}&days=${days}`)
      if (res.ok) setEvents(await res.json())
    } catch {
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [orgId, days])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const suppressEvent = useCallback(async (pattern: string) => {
    if (!orgId) return
    try {
      await fetch('/api/anomaly/suppress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, pattern }),
      })
      fetchHistory()
    } catch {}
  }, [orgId, fetchHistory])

  return { events, isLoading, refetch: fetchHistory, suppressEvent }
}
```

## 6. Frontend Components

### 6.1 Anomaly Settings Panel (`src/features/anomaly/components/AnomalySettingsPanel.tsx`)

Placed in Settings page or Alerts page. Growth plan gate follows `isFeatureAvailable` pattern.

```typescript
'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Shield, Settings } from 'lucide-react'
import { useAnomalySettings } from '../hooks/useAnomalySettings'
import { isFeatureAvailable } from '@/lib/plan-limits'
import type { UserPlan } from '@/types'
import type { AnomalySensitivity } from '@/types/anomaly'

interface AnomalySettingsPanelProps {
  orgId: string | null
  plan: UserPlan
}

const SENSITIVITY_LABELS: Record<AnomalySensitivity, { label: string; desc: string }> = {
  low:    { label: '낮음', desc: 'Z-score 3.0 이상만 감지 (오탐 최소)' },
  medium: { label: '중간', desc: 'Z-score 2.0 이상 감지 (기본값)' },
  high:   { label: '높음', desc: 'Z-score 1.5 이상 감지 (민감)' },
}

export function AnomalySettingsPanel({ orgId, plan }: AnomalySettingsPanelProps) {
  const { settings, isLoading, updateSettings } = useAnomalySettings(orgId)
  const canCustomize = isFeatureAvailable(plan, 'anomaly_detection')

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
  }

  if (!settings) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-slate-900">이상 감지 설정</h3>
          <Badge variant={settings.enabled ? 'info' : 'default'}>
            {settings.enabled ? '활성' : '비활성'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700">이상 감지 활성화</span>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.enabled ? 'bg-indigo-500' : 'bg-slate-300'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              settings.enabled ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        {/* Sensitivity selector */}
        <div>
          <span className="text-sm font-medium text-slate-700">민감도</span>
          {!canCustomize && (
            <Badge variant="warning" className="ml-2">Growth 플랜 필요</Badge>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(Object.keys(SENSITIVITY_LABELS) as AnomalySensitivity[]).map((level) => (
              <button
                key={level}
                disabled={!canCustomize}
                onClick={() => updateSettings({ sensitivity: level })}
                className={`rounded-xl border p-3 text-left transition-all ${
                  settings.sensitivity === level
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                } ${!canCustomize ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <p className="text-sm font-medium text-slate-900">{SENSITIVITY_LABELS[level].label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{SENSITIVITY_LABELS[level].desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detection type toggles */}
        <div className="space-y-3">
          <span className="text-sm font-medium text-slate-700">감지 유형</span>
          {[
            { key: 'dailyCostDetection' as const, label: '일별 비용 이상', desc: '14일 이동 평균 기반' },
            { key: 'hourlySpikeDetection' as const, label: '시간별 스파이크', desc: '24시간 대비 급증' },
            { key: 'modelAnomalyDetection' as const, label: '모델별 이상 사용', desc: '특정 모델 비용 급증' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <button
                disabled={!canCustomize}
                onClick={() => updateSettings({ [key]: !settings[key] })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings[key] ? 'bg-indigo-500' : 'bg-slate-300'
                } ${!canCustomize ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  settings[key] ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

### 6.2 Anomaly History List (`src/features/anomaly/components/AnomalyHistoryList.tsx`)

```typescript
'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Activity, XCircle } from 'lucide-react'
import { useAnomalyHistory } from '../hooks/useAnomalyHistory'

interface AnomalyHistoryListProps {
  orgId: string | null
}

const TYPE_LABELS: Record<string, string> = {
  daily_cost_spike: '일별 비용 급증',
  hourly_spike: '시간별 스파이크',
  model_anomaly: '모델 이상 사용',
  dormant_model_activation: '미사용 모델 활성화',
}

export function AnomalyHistoryList({ orgId }: AnomalyHistoryListProps) {
  const { events, isLoading, suppressEvent } = useAnomalyHistory(orgId)

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-slate-900">이상 감지 이력</h3>
          <Badge variant="default">{events.length}건</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">최근 30일 간 감지된 이상이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 p-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={event.severity === 'critical' ? 'danger' : 'warning'}>
                      {event.severity}
                    </Badge>
                    <span className="text-sm font-medium text-slate-900">
                      {TYPE_LABELS[event.type] ?? event.type}
                    </span>
                    {event.model && (
                      <span className="text-xs text-slate-500">{event.model}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    감지값: ${event.detectedValue.toFixed(2)} / 기준값: ${event.baselineValue.toFixed(2)}
                    {event.zScore > 0 && ` (Z-score: ${event.zScore})`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(event.detectedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => suppressEvent(`${event.type}:${event.model ?? 'all'}`)}
                  title="이 패턴 무시"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### 6.3 Anomaly Detail Panel (`src/features/anomaly/components/AnomalyDetailPanel.tsx`)

Shown when clicking an anomaly alert in the Alerts page.

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, XCircle } from 'lucide-react'
import type { Alert } from '@/types'

interface AnomalyDetailPanelProps {
  alert: Alert
  onSuppress?: (pattern: string) => void
  onClose: () => void
}

export function AnomalyDetailPanel({ alert, onSuppress, onClose }: AnomalyDetailPanelProps) {
  const meta = alert.metadata as Record<string, unknown> | undefined
  if (!meta) return null

  const detectedValue = Number(meta.detectedValue ?? 0)
  const baselineValue = Number(meta.baselineValue ?? 0)
  const severity = (meta.severity as string) ?? 'warning'
  const model = meta.model as string | undefined
  const anomalyType = meta.anomalyType as string | undefined

  const ratio = baselineValue > 0
    ? ((detectedValue / baselineValue) * 100).toFixed(0)
    : '∞'

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardContent className="space-y-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-slate-900">이상 감지 상세</span>
            <Badge variant={severity === 'critical' ? 'danger' : 'warning'}>
              {severity}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {/* Bar comparison */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">기준값</span>
            <span className="font-medium text-slate-900">${baselineValue.toFixed(2)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-slate-400" style={{ width: '100%' }} />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-600">감지값</span>
            <span className="font-bold text-rose-600">${detectedValue.toFixed(2)} ({ratio}%)</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-rose-500"
              style={{ width: `${Math.min(Number(ratio), 300) / 3}%` }}
            />
          </div>
        </div>

        {model && (
          <p className="text-sm text-slate-600">모델: <span className="font-medium">{model}</span></p>
        )}

        {onSuppress && anomalyType && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSuppress(`${anomalyType}:${model ?? 'all'}`)}
          >
            <XCircle className="mr-1 h-4 w-4" /> 이 패턴 무시
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

## 7. Dashboard Integration

### 7.1 CostTrendChart Anomaly Markers

Add `ReferenceDot` from Recharts to mark anomaly points on the chart.

**Modified file**: `src/features/dashboard/components/CostTrendChart.tsx`

```diff
 import {
   ComposedChart,
   Area,
   Line,
+  ReferenceDot,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   Legend,
   ResponsiveContainer,
 } from 'recharts'
 import type { ChartDataPoint } from '@/types/dashboard'
+import type { AnomalyEvent } from '@/types/anomaly'

 interface CostTrendChartProps {
   data: ChartDataPoint[]
   title?: string
   showComparison?: boolean
+  anomalyEvents?: AnomalyEvent[]
 }
```

Inside the `<ComposedChart>`, after the `<Line>` component, add:

```tsx
{/* Anomaly markers */}
{anomalyEvents?.map((event) => {
  const dateKey = event.detectedAt.split('T')[0]
  const dataPoint = data.find((d) => d.date === dateKey)
  if (!dataPoint) return null
  return (
    <ReferenceDot
      key={event.id}
      x={dateKey}
      y={dataPoint.cost}
      r={6}
      fill={event.severity === 'critical' ? '#EF4444' : '#F59E0B'}
      stroke="#fff"
      strokeWidth={2}
    />
  )
})}
```

### 7.2 Dashboard Page Widget

**Modified file**: `src/app/(dashboard)/dashboard/page.tsx`

Add anomaly stat card to the grid and pass anomaly events to CostTrendChart.

Imports to add:
```typescript
import { useAnomalyHistory } from '@/features/anomaly/hooks/useAnomalyHistory'
import { Shield } from 'lucide-react'
```

In the component body:
```typescript
const { events: anomalyEvents } = useAnomalyHistory(orgId, 7)
const recentAnomalies = anomalyEvents.slice(0, 3)
```

In the StatCards grid (after the forecast card):
```tsx
<StatCard
  title="이상 감지"
  value={`${anomalyEvents.length}건`}
  subtitle="최근 7일"
  variant={anomalyEvents.some((e) => e.severity === 'critical') ? 'danger' : anomalyEvents.length > 0 ? 'warning' : 'default'}
  icon={<Shield className="h-4 w-4 text-slate-400" />}
/>
```

Update CostTrendChart call:
```tsx
<CostTrendChart
  data={chartData}
  title={`일별 비용 (최근 ${PERIOD_LABELS[period]})`}
  showComparison
  anomalyEvents={anomalyEvents}
/>
```

## 8. Alerts Page Enhancement

### 8.1 Anomaly Detail Integration

**Modified file**: `src/app/(dashboard)/alerts/page.tsx`

Add state for selected anomaly alert and show `AnomalyDetailPanel`:

```typescript
import { useState } from 'react'
import { AnomalyDetailPanel } from '@/features/anomaly/components/AnomalyDetailPanel'

// Inside AlertsPage:
const [selectedAnomaly, setSelectedAnomaly] = useState<Alert | null>(null)

// In the alert card onClick:
onClick={() => {
  if (a.type === 'anomaly') {
    setSelectedAnomaly(a)
  }
  if (!a.isRead) markAsRead(a.id)
}}

// After the alert list, before closing div:
{selectedAnomaly && selectedAnomaly.type === 'anomaly' && (
  <AnomalyDetailPanel
    alert={selectedAnomaly}
    onSuppress={async (pattern) => {
      await fetch('/api/anomaly/suppress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, pattern }),
      })
      setSelectedAnomaly(null)
    }}
    onClose={() => setSelectedAnomaly(null)}
  />
)}
```

## 9. Plan Limits Update

### 9.1 Feature Gate (`src/lib/plan-limits.ts`)

Update `isFeatureAvailable` union type:

```diff
 export function isFeatureAvailable(
   plan: UserPlan,
-  feature: 'optimization' | 'analytics' | 'export' | 'team' | 'budget_alerts'
+  feature: 'optimization' | 'analytics' | 'export' | 'team' | 'budget_alerts' | 'anomaly_detection'
 ): boolean {
   if (plan === 'growth') return true
   return false
 }
```

### 9.2 Vercel Cron Schedule (`vercel.json`)

Add hourly anomaly detection cron:

```json
{
  "crons": [
    { "path": "/api/sync/schedule", "schedule": "0 3 * * *" },
    { "path": "/api/cron/report-usage", "schedule": "0 0 1 * *" },
    { "path": "/api/cron/detect-anomalies", "schedule": "0 * * * *" }
  ]
}
```

## 10. Implementation Files Summary

### 10.1 New Files (12)

| # | File | Purpose | LOC |
|---|------|---------|-----|
| 1 | `src/types/anomaly.ts` | Types + constants | ~80 |
| 2 | `src/services/anomaly-stats.service.ts` | Usage stats aggregation | ~80 |
| 3 | `src/services/anomaly.service.ts` | Core detection + settings | ~220 |
| 4 | `src/app/api/cron/detect-anomalies/route.ts` | Cron endpoint | ~35 |
| 5 | `src/app/api/anomaly/settings/route.ts` | Settings GET/PATCH | ~30 |
| 6 | `src/app/api/anomaly/history/route.ts` | History GET | ~20 |
| 7 | `src/app/api/anomaly/suppress/route.ts` | Suppress POST | ~20 |
| 8 | `src/features/anomaly/hooks/useAnomalySettings.ts` | Settings hook | ~45 |
| 9 | `src/features/anomaly/hooks/useAnomalyHistory.ts` | History hook | ~40 |
| 10 | `src/features/anomaly/components/AnomalySettingsPanel.tsx` | Settings UI | ~110 |
| 11 | `src/features/anomaly/components/AnomalyHistoryList.tsx` | History list | ~80 |
| 12 | `src/features/anomaly/components/AnomalyDetailPanel.tsx` | Detail panel | ~75 |

### 10.2 Modified Files (5)

| # | File | Change |
|---|------|--------|
| 1 | `src/types/index.ts` | Add anomaly type exports |
| 2 | `src/features/dashboard/components/CostTrendChart.tsx` | Add `ReferenceDot` anomaly markers + `anomalyEvents` prop |
| 3 | `src/app/(dashboard)/dashboard/page.tsx` | Add anomaly stat card + pass events to chart |
| 4 | `src/app/(dashboard)/alerts/page.tsx` | Add anomaly detail panel on click |
| 5 | `src/lib/plan-limits.ts` | Add `'anomaly_detection'` to feature union |
| 6 | `vercel.json` | Add cron schedule for detect-anomalies |

**Total**: ~835 LOC new, ~30 LOC modified

## 11. Implementation Order

```
Phase 1: Data Layer (FR-08 → FR-01)
  1. src/types/anomaly.ts
  2. src/types/index.ts (add exports)
  3. src/services/anomaly-stats.service.ts
  4. src/services/anomaly.service.ts

Phase 2: APIs (FR-02 → FR-03 → FR-06)
  5. src/app/api/cron/detect-anomalies/route.ts
  6. src/app/api/anomaly/settings/route.ts
  7. src/app/api/anomaly/history/route.ts
  8. src/app/api/anomaly/suppress/route.ts
  9. src/lib/plan-limits.ts (add 'anomaly_detection')
  10. vercel.json (add cron)

Phase 3: Dashboard (FR-04)
  11. src/features/anomaly/hooks/useAnomalyHistory.ts
  12. src/features/dashboard/components/CostTrendChart.tsx (add markers)
  13. src/app/(dashboard)/dashboard/page.tsx (add stat + events)

Phase 4: Settings + Alerts UI (FR-05 → FR-07)
  14. src/features/anomaly/hooks/useAnomalySettings.ts
  15. src/features/anomaly/components/AnomalySettingsPanel.tsx
  16. src/features/anomaly/components/AnomalyHistoryList.tsx
  17. src/features/anomaly/components/AnomalyDetailPanel.tsx
  18. src/app/(dashboard)/alerts/page.tsx (add detail panel)
```

## 12. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Z-score for daily detection | Simple, well-understood, no ML dependency. Works with 3+ data points. |
| Multiplier for hourly/model | Z-score unreliable for small samples; simple ratio is more intuitive. |
| 24h dedup window | Prevents alert fatigue. Same anomaly type won't re-trigger within a day. |
| Pattern-based suppression | `type:model` key allows fine-grained control without complex UI. |
| Settings auto-create on first GET | No migration needed. Default settings appear automatically. |
| Free plan = default settings only | Feature gate via `isFeatureAvailable`. Growth users get full control. |
| Cron uses `bkendService` (service token) | System-level scan doesn't have user context. Uses admin token. |

## 13. Edge Cases & Error Handling

| Scenario | Handling |
|----------|---------|
| New org with <3 days data | Daily detection skipped (requires `dailyStats.length >= 3`) |
| Zero standard deviation | `calcZScore` returns 0, no false positive |
| No usage records at all | All detection functions return empty arrays gracefully |
| Cron timeout (Vercel 60s limit) | Orgs processed sequentially. If timeout, remaining orgs retry next hour. |
| bkend.ai API failure in cron | Per-org try/catch. Failed orgs counted, cron returns partial results. |
| Concurrent cron executions | 24h dedup window prevents duplicate alerts even if cron overlaps. |
