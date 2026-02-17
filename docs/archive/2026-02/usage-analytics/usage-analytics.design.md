# Design: Usage Analytics

> Feature: usage-analytics
> Plan Reference: `docs/01-plan/features/usage-analytics.plan.md`
> Created: 2026-02-17
> Status: **DESIGN**

## 1. Overview

SaaS 플랫폼의 사용자 행동을 자체 추적/분석하는 Growth 핵심 기능.
클라이언트에서 이벤트를 수집하고, 서버에서 집계하여 관리자 대시보드로 시각화한다.

**핵심 목표**: 외부 도구(GA, Mixpanel) 없이 자체 경량 분석 시스템 구축.

## 2. Data Model

### 2.1 analytics_events 테이블

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('page_view', 'feature_use', 'button_click', 'onboarding_step', 'session_start', 'session_end')),
  name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_analytics_events_org_created ON analytics_events (org_id, created_at DESC);
CREATE INDEX idx_analytics_events_type ON analytics_events (type, created_at DESC);
CREATE INDEX idx_analytics_events_user ON analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events (session_id);
```

### 2.2 TypeScript 타입 정의

```typescript
// src/types/analytics.ts

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

// Client-side event (before sending to server)
export interface TrackEvent {
  type: AnalyticsEventType
  name: string
  metadata?: Record<string, unknown>
}

// Batch request payload
export interface EventBatchPayload {
  events: TrackEvent[]
  sessionId: string
}

// Dashboard summary response
export interface AnalyticsSummary {
  dau: number
  wau: number
  mau: number
  avgSessionDuration: number  // seconds
  totalEvents: number
  dauChange: number  // % vs previous period
  wauChange: number
  mauChange: number
}

// Page stats
export interface PageStat {
  path: string
  views: number
  uniqueUsers: number
  avgDuration: number  // seconds
}

// Feature stats
export interface FeatureStat {
  name: string
  usageCount: number
  uniqueUsers: number
}

// Funnel step
export interface FunnelStep {
  step: string
  label: string
  count: number
  rate: number  // conversion rate from step 1 (%)
  dropoff: number  // % lost from previous step
}

// Retention cohort
export interface RetentionCohort {
  cohortWeek: string  // ISO week start date
  cohortSize: number
  retention: number[]  // [week0, week1, ..., week7] percentages
}

// Analytics period
export type AnalyticsPeriod = '7d' | '30d' | '90d'
```

## 3. API Design

### 3.1 POST /api/analytics/events — 이벤트 배치 수신

```typescript
// src/app/api/analytics/events/route.ts

// Request Body:
interface EventBatchPayload {
  events: TrackEvent[]  // max 50 per batch
  sessionId: string
}

// Response: 201 Created
{ received: number }

// Error: 400 Bad Request
{ error: 'Validation failed', details: string[] }

// Error: 401 Unauthorized
{ error: 'Unauthorized' }

// Error: 429 Too Many Requests
{ error: 'Rate limit exceeded' }
```

**구현 세부사항:**
- `getMeServer()` 로 인증 검증
- 사용자의 `orgId`를 users 테이블에서 조회
- 각 이벤트에 `orgId`, `userId`, `sessionId`, `createdAt` 자동 주입
- 이벤트 유효성 검증: `type`이 허용 목록에 포함, `name` 필수
- 배치 최대 50개 제한
- Rate limiting: 인메모리 Map으로 userId별 분당 100이벤트 제한

```typescript
// Rate limit implementation
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100  // per minute
const WINDOW_MS = 60_000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}
```

### 3.2 GET /api/analytics/summary — 핵심 지표

```typescript
// src/app/api/analytics/summary/route.ts

// Query params:
// ?orgId=xxx&period=30d

// Response: 200 OK
{
  dau: 42,
  wau: 156,
  mau: 312,
  avgSessionDuration: 384,
  totalEvents: 12450,
  dauChange: 12.5,
  wauChange: 8.2,
  mauChange: 15.0
}
```

**집계 로직:**
- **DAU**: period 마지막 날 기준 distinct userId count
- **WAU**: period 마지막 7일 기준 distinct userId count
- **MAU**: period 마지막 30일 기준 distinct userId count
- **avgSessionDuration**: session_start ~ session_end 간 시간차 평균
- **변화율**: 현재 기간 vs 이전 동일 기간 비교

```typescript
// DAU calculation
const today = new Date().toISOString().split('T')[0]
const dauEvents = await bkend.get<AnalyticsEvent[]>('/analytics-events', {
  params: {
    orgId,
    type: 'page_view',
    createdAt_gte: `${today}T00:00:00Z`,
    createdAt_lte: `${today}T23:59:59Z`,
  },
})
const dau = new Set(dauEvents.map(e => e.userId)).size
```

### 3.3 GET /api/analytics/pages — 페이지별 방문 순위

```typescript
// src/app/api/analytics/pages/route.ts

// Query params:
// ?orgId=xxx&period=30d&limit=10

// Response: 200 OK
[
  { path: '/dashboard', views: 1240, uniqueUsers: 89, avgDuration: 120 },
  { path: '/providers', views: 856, uniqueUsers: 72, avgDuration: 95 },
  ...
]
```

**집계 로직:**
- `type = 'page_view'` 이벤트만 필터
- `name` (페이지 경로) 기준 그룹핑
- `metadata.duration`으로 평균 체류시간 계산
- views 내림차순 정렬, 상위 limit개 반환

### 3.4 GET /api/analytics/features — 기능별 사용률

```typescript
// src/app/api/analytics/features/route.ts

// Query params:
// ?orgId=xxx&period=30d

// Response: 200 OK
[
  { name: 'sync_trigger', usageCount: 450, uniqueUsers: 67 },
  { name: 'provider_add', usageCount: 120, uniqueUsers: 45 },
  ...
]
```

**집계 로직:**
- `type = 'feature_use'` 이벤트만 필터
- `name` 기준 그룹핑, count + distinct userId

### 3.5 GET /api/analytics/funnel — 퍼널 전환율

```typescript
// src/app/api/analytics/funnel/route.ts

// Query params:
// ?orgId=xxx&period=90d

// Response: 200 OK
[
  { step: 'signup', label: '회원가입', count: 500, rate: 100, dropoff: 0 },
  { step: 'onboarding_complete', label: '온보딩 완료', count: 350, rate: 70, dropoff: 30 },
  { step: 'provider_add', label: '프로바이더 등록', count: 280, rate: 56, dropoff: 20 },
  { step: 'first_sync', label: '첫 동기화', count: 210, rate: 42, dropoff: 25 },
  { step: 'retention_7d', label: '7일 리텐션', count: 150, rate: 30, dropoff: 28.6 }
]
```

**집계 로직:**
- 각 퍼널 단계별 distinct userId count
- **회원가입**: period 내 생성된 users count
- **온보딩 완료**: `onboarding_step` 이벤트 중 `name = 'complete'`인 userId
- **프로바이더 등록**: `feature_use` 이벤트 중 `name = 'provider_add'`인 userId
- **첫 동기화**: `feature_use` 이벤트 중 `name = 'sync_trigger'`인 userId
- **7일 리텐션**: 가입 후 7일 이내 재방문 userId
- rate = (현재 단계 count / step1 count) * 100
- dropoff = ((이전 단계 count - 현재 count) / 이전 단계 count) * 100

### 3.6 GET /api/analytics/retention — 리텐션 코호트

```typescript
// src/app/api/analytics/retention/route.ts

// Query params:
// ?orgId=xxx&weeks=8

// Response: 200 OK
[
  {
    cohortWeek: '2026-01-06',
    cohortSize: 45,
    retention: [100, 78, 62, 55, 48, 42, 38, 35]
  },
  {
    cohortWeek: '2026-01-13',
    cohortSize: 52,
    retention: [100, 81, 65, 58, 51, 44, 40]
  },
  ...
]
```

**집계 로직:**
- 가입 주 기준 코호트 생성 (ISO week)
- 각 후속 주에 1회 이상 page_view가 있으면 retained
- retention[n] = (n주 후 재방문 유저 수 / 코호트 크기) * 100
- 최근 8주 코호트 반환

## 4. Component Design

### 4.1 AnalyticsProvider (전역 이벤트 수집)

```
파일: src/features/analytics/providers/AnalyticsProvider.tsx
타입: 'use client' Provider Component

Props: { children: React.ReactNode }

기능:
├── 자동 page_view 추적 (usePathname 감지)
├── session_start / session_end 관리
├── 이벤트 배치 큐 관리
│   ├── 큐에 이벤트 추가
│   ├── 5초 타이머 또는 10개 누적 시 flush
│   └── beforeunload 시 navigator.sendBeacon fallback
└── AnalyticsContext 제공 (track 함수)
```

**구현 세부사항:**

```typescript
'use client'

import { createContext, useContext, useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import type { TrackEvent } from '@/types/analytics'

interface AnalyticsContextValue {
  track: (event: TrackEvent) => void
}

const AnalyticsContext = createContext<AnalyticsContextValue>({ track: () => {} })

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const queueRef = useRef<TrackEvent[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const sessionIdRef = useRef<string>(generateSessionId())
  const pageEnterRef = useRef<number>(Date.now())

  // Generate session ID (persist per browser tab)
  function generateSessionId(): string {
    if (typeof window === 'undefined') return ''
    let sid = sessionStorage.getItem('analytics_sid')
    if (!sid) {
      sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      sessionStorage.setItem('analytics_sid', sid)
    }
    return sid
  }

  // Flush queue to server
  const flush = useCallback(async () => {
    const events = queueRef.current.splice(0)
    if (events.length === 0) return
    const body = JSON.stringify({
      events,
      sessionId: sessionIdRef.current,
    })

    // Use sendBeacon as fallback (page unload)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const sent = navigator.sendBeacon('/api/analytics/events', new Blob([body], { type: 'application/json' }))
      if (sent) return
    }

    // Regular fetch
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    } catch {
      // Silent fail - analytics should never break the app
    }
  }, [])

  // Track event
  const track = useCallback((event: TrackEvent) => {
    queueRef.current.push({
      ...event,
      metadata: { ...event.metadata, timestamp: new Date().toISOString() },
    })

    // Flush if queue reaches 10
    if (queueRef.current.length >= 10) {
      flush()
    } else {
      // Reset 5-second timer
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(flush, 5000)
    }
  }, [flush])

  // Auto page_view tracking
  useEffect(() => {
    pageEnterRef.current = Date.now()
    track({ type: 'page_view', name: pathname })

    return () => {
      // Track duration when leaving page
      const duration = Math.round((Date.now() - pageEnterRef.current) / 1000)
      if (duration > 0) {
        queueRef.current.push({
          type: 'page_view',
          name: pathname,
          metadata: { duration, action: 'leave' },
        })
      }
    }
  }, [pathname, track])

  // Session start
  useEffect(() => {
    track({ type: 'session_start', name: 'session' })

    // Flush on unload
    const handleUnload = () => {
      track({ type: 'session_end', name: 'session' })
      flush()
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [track, flush])

  // Periodic flush (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(flush, 5000)
    return () => clearInterval(interval)
  }, [flush])

  return (
    <AnalyticsContext.Provider value={{ track }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export const useAnalyticsContext = () => useContext(AnalyticsContext)
```

### 4.2 useAnalytics Hook

```
파일: src/features/analytics/hooks/useAnalytics.ts
타입: Custom Hook

반환값:
├── track(event: TrackEvent) → void
├── trackFeature(name: string, metadata?) → void  // feature_use shorthand
├── trackClick(name: string, metadata?) → void    // button_click shorthand
└── trackOnboarding(step: string, metadata?) → void // onboarding_step shorthand
```

**구현:**

```typescript
'use client'

import { useCallback } from 'react'
import { useAnalyticsContext } from '../providers/AnalyticsProvider'

export function useAnalytics() {
  const { track } = useAnalyticsContext()

  const trackFeature = useCallback(
    (name: string, metadata?: Record<string, unknown>) => {
      track({ type: 'feature_use', name, metadata })
    },
    [track],
  )

  const trackClick = useCallback(
    (name: string, metadata?: Record<string, unknown>) => {
      track({ type: 'button_click', name, metadata })
    },
    [track],
  )

  const trackOnboarding = useCallback(
    (step: string, metadata?: Record<string, unknown>) => {
      track({ type: 'onboarding_step', name: step, metadata })
    },
    [track],
  )

  return { track, trackFeature, trackClick, trackOnboarding }
}
```

### 4.3 useAnalyticsDashboard Hook

```
파일: src/features/analytics/hooks/useAnalyticsDashboard.ts
타입: Custom Hook (데이터 페칭)

Params: { orgId: string | null, period: AnalyticsPeriod }

반환값:
├── summary: AnalyticsSummary | null
├── pages: PageStat[]
├── features: FeatureStat[]
├── funnel: FunnelStep[]
├── retention: RetentionCohort[]
├── isLoading: boolean
├── error: string | null
└── refetch: () => void
```

**구현:**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  AnalyticsSummary, PageStat, FeatureStat,
  FunnelStep, RetentionCohort, AnalyticsPeriod,
} from '@/types/analytics'

interface UseAnalyticsDashboardOptions {
  orgId: string | null
  period: AnalyticsPeriod
}

export function useAnalyticsDashboard({ orgId, period }: UseAnalyticsDashboardOptions) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [pages, setPages] = useState<PageStat[]>([])
  const [features, setFeatures] = useState<FeatureStat[]>([])
  const [funnel, setFunnel] = useState<FunnelStep[]>([])
  const [retention, setRetention] = useState<RetentionCohort[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    setError(null)

    try {
      const base = `/api/analytics`
      const qs = `orgId=${orgId}&period=${period}`

      const [summaryRes, pagesRes, featuresRes, funnelRes, retentionRes] = await Promise.all([
        fetch(`${base}/summary?${qs}`),
        fetch(`${base}/pages?${qs}&limit=10`),
        fetch(`${base}/features?${qs}`),
        fetch(`${base}/funnel?${qs}`),
        fetch(`${base}/retention?${qs}&weeks=8`),
      ])

      if (!summaryRes.ok) throw new Error(`Summary: ${summaryRes.status}`)

      const [s, p, f, fn, r] = await Promise.all([
        summaryRes.json(),
        pagesRes.ok ? pagesRes.json() : [],
        featuresRes.ok ? featuresRes.json() : [],
        funnelRes.ok ? funnelRes.json() : [],
        retentionRes.ok ? retentionRes.json() : [],
      ])

      setSummary(s)
      setPages(p)
      setFeatures(f)
      setFunnel(fn)
      setRetention(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, period])

  useEffect(() => { fetchData() }, [fetchData])

  return { summary, pages, features, funnel, retention, isLoading, error, refetch: fetchData }
}
```

### 4.4 AnalyticsDashboard (메인 페이지 컴포넌트)

```
파일: src/features/analytics/components/AnalyticsDashboard.tsx
타입: 'use client' Component

구조:
├── Header: "사용자 분석" + PeriodSelector
├── MetricCards (4개: DAU, WAU, MAU, 평균 세션 시간)
├── Row 1: ActiveUsersChart (Line, full width)
├── Row 2: PageRankChart (Bar) + FeatureUsageChart (Bar)
├── Row 3: FunnelChart (Horizontal Bar, full width)
└── Row 4: RetentionCohort (Heatmap table, full width)
```

**구현:**

```typescript
'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { useAnalyticsDashboard } from '../hooks/useAnalyticsDashboard'
import { PeriodSelector } from '@/features/dashboard/components/PeriodSelector'
import { MetricCards } from './MetricCards'
import { ActiveUsersChart } from './ActiveUsersChart'
import { PageRankChart } from './PageRankChart'
import { FeatureUsageChart } from './FeatureUsageChart'
import { FunnelChart } from './FunnelChart'
import { RetentionCohort } from './RetentionCohort'
import type { AnalyticsPeriod } from '@/types/analytics'

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const orgId = useAppStore((s) => s.currentOrgId)
  const { summary, pages, features, funnel, retention, isLoading, error } = useAnalyticsDashboard({ orgId, period })

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">사용자 분석</h1>
          <p className="text-sm text-slate-500">서비스 사용 현황 및 Growth 지표</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Metric Cards */}
      <MetricCards summary={summary} isLoading={isLoading} />

      {/* Active Users Trend */}
      <ActiveUsersChart orgId={orgId} period={period} />

      {/* Page Rank + Feature Usage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PageRankChart data={pages} isLoading={isLoading} />
        <FeatureUsageChart data={features} isLoading={isLoading} />
      </div>

      {/* Funnel */}
      <FunnelChart data={funnel} isLoading={isLoading} />

      {/* Retention Cohort */}
      <RetentionCohort data={retention} isLoading={isLoading} />
    </div>
  )
}
```

### 4.5 MetricCards

```
파일: src/features/analytics/components/MetricCards.tsx
타입: 'use client' Component

Props: { summary: AnalyticsSummary | null, isLoading: boolean }

레이아웃: 4-column grid
├── DAU (Users 아이콘, dauChange)
├── WAU (UserCheck 아이콘, wauChange)
├── MAU (UsersRound 아이콘, mauChange)
└── 평균 세션 시간 (Clock 아이콘, mm:ss 포맷)

재사용: StatCard 컴포넌트
```

**구현:**

```typescript
import { StatCard } from '@/features/dashboard/components/StatCard'
import { Users, UserCheck, UsersRound, Clock } from 'lucide-react'
import type { AnalyticsSummary } from '@/types/analytics'

interface MetricCardsProps {
  summary: AnalyticsSummary | null
  isLoading: boolean
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}분 ${s}초`
}

export function MetricCards({ summary, isLoading }: MetricCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="DAU"
        value={summary.dau.toLocaleString()}
        change={summary.dauChange}
        icon={<Users className="h-4 w-4 text-indigo-500" />}
      />
      <StatCard
        title="WAU"
        value={summary.wau.toLocaleString()}
        change={summary.wauChange}
        icon={<UserCheck className="h-4 w-4 text-violet-500" />}
      />
      <StatCard
        title="MAU"
        value={summary.mau.toLocaleString()}
        change={summary.mauChange}
        icon={<UsersRound className="h-4 w-4 text-blue-500" />}
      />
      <StatCard
        title="평균 세션 시간"
        value={formatDuration(summary.avgSessionDuration)}
        icon={<Clock className="h-4 w-4 text-emerald-500" />}
      />
    </div>
  )
}
```

**StatCard 호환성 참고:** 기존 `StatCard`의 `change` prop은 비용 기준으로 "감소 = 좋음" (녹색). 사용자 지표에서는 "증가 = 좋음"이므로 `change` 값의 부호를 반전하여 전달:
- DAU 12.5% 증가 → `change={-12.5}` (녹색 표시)

### 4.6 ActiveUsersChart

```
파일: src/features/analytics/components/ActiveUsersChart.tsx
타입: 'use client' Component

Props: { orgId: string | null, period: AnalyticsPeriod }

차트: Recharts AreaChart (Line with gradient fill)
├── X축: 날짜
├── Y축: 활성 사용자 수
├── 데이터: 일별 distinct userId count
└── 스타일: indigo gradient (기존 CostTrendChart 패턴 참조)

데이터 소스: summary API에서 일별 데이터도 함께 반환
(또는 별도 /api/analytics/daily-users 엔드포인트)
```

**구현 선택: summary API 응답에 dailyUsers 필드 추가**

```typescript
// AnalyticsSummary에 추가
export interface DailyUserCount {
  date: string   // YYYY-MM-DD
  count: number  // distinct users
}

// summary 응답에 포함
{
  ...summary,
  dailyUsers: DailyUserCount[]
}
```

```typescript
'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { DailyUserCount } from '@/types/analytics'

interface ActiveUsersChartProps {
  data: DailyUserCount[]
  isLoading: boolean
}

export function ActiveUsersChart({ data, isLoading }: ActiveUsersChartProps) {
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold text-slate-900">일별 활성 사용자</h3>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94A3B8' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <Tooltip
                formatter={(v: number) => [Number(v), '사용자']}
                labelFormatter={(l) => `날짜: ${l}`}
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#4F46E5"
                strokeWidth={2.5}
                fill="url(#colorUsers)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 4.7 PageRankChart

```
파일: src/features/analytics/components/PageRankChart.tsx
타입: 'use client' Component

Props: { data: PageStat[], isLoading: boolean }

차트: Recharts BarChart (Horizontal)
├── Y축: 페이지 경로 (한국어 라벨 매핑)
├── X축: 방문 수
└── 바 색상: indigo-500
```

**페이지 경로 라벨 매핑:**
```typescript
const PAGE_LABELS: Record<string, string> = {
  '/dashboard': '대시보드',
  '/providers': '프로바이더',
  '/projects': '프로젝트',
  '/budget': '예산',
  '/alerts': '알림',
  '/reports': '리포트',
  '/proxy': '프록시',
  '/team': '팀',
  '/playground': '플레이그라운드',
  '/templates': '템플릿',
  '/settings': '설정',
  '/analytics': '분석',
}
```

### 4.8 FeatureUsageChart

```
파일: src/features/analytics/components/FeatureUsageChart.tsx
타입: 'use client' Component

Props: { data: FeatureStat[], isLoading: boolean }

차트: Recharts BarChart (Vertical)
├── X축: 기능명 (한국어 라벨 매핑)
├── Y축: 사용 횟수
└── 바 색상: violet-500
```

**기능명 라벨 매핑:**
```typescript
const FEATURE_LABELS: Record<string, string> = {
  'provider_add': '프로바이더 추가',
  'budget_set': '예산 설정',
  'alert_create': '알림 생성',
  'sync_trigger': '동기화 실행',
  'report_export': '리포트 내보내기',
  'proxy_key_create': '프록시 키 생성',
  'template_create': '템플릿 생성',
  'playground_run': '플레이그라운드 실행',
  'team_invite': '팀 초대',
}
```

### 4.9 FunnelChart

```
파일: src/features/analytics/components/FunnelChart.tsx
타입: 'use client' Component

Props: { data: FunnelStep[], isLoading: boolean }

차트: Recharts BarChart (Horizontal) with custom labels
├── Y축: 퍼널 단계 (label)
├── X축: 사용자 수 (count)
├── 바 내부: count + rate% 표시
├── 바 색상: 단계별 그라데이션 (indigo-500 → indigo-300)
└── 각 바 사이: dropoff% 표시
```

**구현:**

```typescript
'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import type { FunnelStep } from '@/types/analytics'

const FUNNEL_COLORS = ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE']

interface FunnelChartProps {
  data: FunnelStep[]
  isLoading: boolean
}

export function FunnelChart({ data, isLoading }: FunnelChartProps) {
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><h3 className="text-lg font-bold text-slate-900">퍼널 전환율</h3></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">데이터가 충분하지 않습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold text-slate-900">퍼널 전환율</h3>
        <p className="text-sm text-slate-500">회원가입 → 7일 리텐션 전환 경로</p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 80, left: 100, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 13, fill: '#334155' }} width={90} />
              <Tooltip
                formatter={(v: number) => [Number(v), '사용자']}
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                ))}
                <LabelList
                  dataKey="rate"
                  position="right"
                  formatter={(v: number) => `${Number(v).toFixed(0)}%`}
                  style={{ fontSize: 12, fontWeight: 600, fill: '#6366F1' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 4.10 RetentionCohort

```
파일: src/features/analytics/components/RetentionCohort.tsx
타입: 'use client' Component

Props: { data: RetentionCohort[], isLoading: boolean }

렌더링: HTML 테이블 (히트맵 스타일)
├── 행: 코호트 주 (가입 주)
├── 열: Week 0 ~ Week 7
├── 셀: 리텐션 % (색상 강도로 표현)
│   ├── 100%: indigo-600
│   ├── 75%+: indigo-500
│   ├── 50%+: indigo-400
│   ├── 25%+: indigo-300
│   └── <25%: indigo-100
└── 코호트 크기 표시
```

**구현:**

```typescript
'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { RetentionCohort as RetentionCohortType } from '@/types/analytics'

interface RetentionCohortProps {
  data: RetentionCohortType[]
  isLoading: boolean
}

function getRetentionColor(rate: number): string {
  if (rate >= 75) return 'bg-indigo-600 text-white'
  if (rate >= 50) return 'bg-indigo-400 text-white'
  if (rate >= 25) return 'bg-indigo-200 text-indigo-900'
  if (rate > 0) return 'bg-indigo-100 text-indigo-700'
  return 'bg-slate-50 text-slate-400'
}

export function RetentionCohort({ data, isLoading }: RetentionCohortProps) {
  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><h3 className="text-lg font-bold text-slate-900">리텐션 코호트</h3></CardHeader>
        <CardContent><p className="text-sm text-slate-500">데이터가 충분하지 않습니다.</p></CardContent>
      </Card>
    )
  }

  const maxWeeks = Math.max(...data.map(d => d.retention.length))

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold text-slate-900">리텐션 코호트</h3>
        <p className="text-sm text-slate-500">주간 코호트별 재방문율</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">코호트</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">크기</th>
                {Array.from({ length: maxWeeks }).map((_, i) => (
                  <th key={i} className="px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    W{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((cohort) => (
                <tr key={cohort.cohortWeek}>
                  <td className="px-3 py-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                    {cohort.cohortWeek}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-slate-600">
                    {cohort.cohortSize}
                  </td>
                  {cohort.retention.map((rate, i) => (
                    <td key={i} className="px-1 py-1">
                      <div className={cn(
                        'flex h-8 items-center justify-center rounded-lg text-xs font-medium',
                        getRetentionColor(rate),
                      )}>
                        {rate.toFixed(0)}%
                      </div>
                    </td>
                  ))}
                  {/* Fill remaining cells if shorter */}
                  {Array.from({ length: maxWeeks - cohort.retention.length }).map((_, i) => (
                    <td key={`empty-${i}`} className="px-1 py-1">
                      <div className="flex h-8 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-300">
                        -
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
```

## 5. Page Route

### 5.1 Analytics Page

```
파일: src/app/(dashboard)/analytics/page.tsx
타입: Page Component

구조:
└── <AnalyticsDashboard />
```

```typescript
import { AnalyticsDashboard } from '@/features/analytics/components/AnalyticsDashboard'

export default function AnalyticsPage() {
  return <AnalyticsDashboard />
}
```

## 6. Integration Changes

### 6.1 Dashboard Layout — AnalyticsProvider 래핑

```
파일: src/app/(dashboard)/layout.tsx

변경: children을 AnalyticsProvider로 래핑
```

```typescript
// Before:
<main>{children}</main>

// After:
import { AnalyticsProvider } from '@/features/analytics/providers/AnalyticsProvider'

<AnalyticsProvider>
  <main>{children}</main>
</AnalyticsProvider>
```

**주의:** layout.tsx는 현재 Server Component. AnalyticsProvider는 `'use client'`이므로 layout 자체를 `'use client'`로 변경하거나, AnalyticsProvider를 main 내부에만 래핑.

**결정:** layout.tsx에 `'use client'` 추가하고 AnalyticsProvider 래핑. (기존 NavBar도 client component이므로 문제 없음)

### 6.2 NAV_ITEMS — '분석' 메뉴 추가

```
파일: src/lib/constants.ts

변경: NAV_ITEMS 배열에 analytics 항목 추가
```

```typescript
// 추가 항목 (리포트 다음 위치)
{ label: '분석', href: '/analytics', icon: 'BarChart3' }
```

### 6.3 NavBar — 아이콘 맵 + 권한 체크

```
파일: src/components/layout/NavBar.tsx

변경:
1. iconMap에 BarChart3 추가
2. owner/admin만 '분석' 메뉴 표시 (옵션: 현재 NAV_ITEMS 전체 표시하므로 Phase 1에서는 모든 사용자에게 표시, 추후 RBAC 필터 추가)
```

```typescript
import { ..., BarChart3 } from 'lucide-react'

const iconMap = {
  ...,
  BarChart3,
}
```

### 6.4 Middleware — 보호 경로 추가

```
파일: src/middleware.ts

변경: protectedPaths에 '/analytics' 추가
```

```typescript
const protectedPaths = [
  '/dashboard', '/providers', '/budget', '/alerts',
  '/reports', '/projects', '/settings', '/billing', '/proxy', '/team',
  '/analytics',  // 추가
]
```

### 6.5 타입 exports

```
파일: src/types/index.ts

변경: analytics 타입 re-export 추가
```

```typescript
export type {
  AnalyticsEventType, AnalyticsEvent, TrackEvent, EventBatchPayload,
  AnalyticsSummary, PageStat, FeatureStat, FunnelStep,
  RetentionCohort, AnalyticsPeriod, DailyUserCount,
} from './analytics'
```

## 7. File Inventory

### 7.1 New Files (17)

| # | File | LOC (est.) | Purpose |
|---|------|-----------|---------|
| 1 | `src/types/analytics.ts` | ~80 | 타입 정의 |
| 2 | `src/features/analytics/providers/AnalyticsProvider.tsx` | ~110 | 전역 이벤트 수집 |
| 3 | `src/features/analytics/hooks/useAnalytics.ts` | ~35 | 이벤트 추적 훅 |
| 4 | `src/features/analytics/hooks/useAnalyticsDashboard.ts` | ~65 | 대시보드 데이터 훅 |
| 5 | `src/features/analytics/components/AnalyticsDashboard.tsx` | ~55 | 메인 대시보드 |
| 6 | `src/features/analytics/components/MetricCards.tsx` | ~55 | DAU/WAU/MAU 카드 |
| 7 | `src/features/analytics/components/ActiveUsersChart.tsx` | ~55 | 일별 활성 사용자 |
| 8 | `src/features/analytics/components/PageRankChart.tsx` | ~65 | 페이지별 방문 순위 |
| 9 | `src/features/analytics/components/FeatureUsageChart.tsx` | ~65 | 기능별 사용률 |
| 10 | `src/features/analytics/components/FunnelChart.tsx` | ~75 | 퍼널 전환율 |
| 11 | `src/features/analytics/components/RetentionCohort.tsx` | ~85 | 리텐션 코호트 히트맵 |
| 12 | `src/app/api/analytics/events/route.ts` | ~90 | 이벤트 배치 수신 API |
| 13 | `src/app/api/analytics/summary/route.ts` | ~120 | 핵심 지표 API |
| 14 | `src/app/api/analytics/pages/route.ts` | ~60 | 페이지별 통계 API |
| 15 | `src/app/api/analytics/features/route.ts` | ~55 | 기능별 통계 API |
| 16 | `src/app/api/analytics/funnel/route.ts` | ~80 | 퍼널 데이터 API |
| 17 | `src/app/(dashboard)/analytics/page.tsx` | ~8 | 라우트 페이지 |

**Total estimated: ~1,158 LOC**

### 7.2 Modified Files (5)

| # | File | Changes |
|---|------|---------|
| 1 | `src/app/(dashboard)/layout.tsx` | `'use client'` + AnalyticsProvider 래핑 |
| 2 | `src/lib/constants.ts` | NAV_ITEMS에 '분석' 추가 |
| 3 | `src/components/layout/NavBar.tsx` | iconMap에 BarChart3 추가 |
| 4 | `src/middleware.ts` | protectedPaths에 '/analytics' 추가 |
| 5 | `src/types/index.ts` | analytics 타입 re-export |

**Note:** retention API는 별도 route 파일 없이 summary API에서 dailyUsers를 포함하여 반환. retention은 별도 `/api/analytics/retention/route.ts`로 분리.

## 8. Implementation Order

| Phase | Files | Description |
|-------|-------|-------------|
| **Phase 1: Types + Events API** | `analytics.ts`, `events/route.ts` | 타입 정의 + 이벤트 수신 API + rate limiting |
| **Phase 2: Client Collection** | `AnalyticsProvider.tsx`, `useAnalytics.ts` | 전역 이벤트 수집 + 배치 전송 |
| **Phase 3: Analytics APIs** | `summary/route.ts`, `pages/route.ts`, `features/route.ts`, `funnel/route.ts`, `retention/route.ts` | 5개 분석 엔드포인트 |
| **Phase 4: Dashboard UI** | `AnalyticsDashboard.tsx`, `MetricCards.tsx`, `ActiveUsersChart.tsx`, `PageRankChart.tsx`, `FeatureUsageChart.tsx`, `FunnelChart.tsx`, `RetentionCohort.tsx`, `useAnalyticsDashboard.ts` | 7개 컴포넌트 + 데이터 훅 |
| **Phase 5: Integration** | `layout.tsx`, `constants.ts`, `NavBar.tsx`, `middleware.ts`, `types/index.ts`, `analytics/page.tsx` | 레이아웃 래핑, 내비게이션, 라우팅 |

## 9. Reusable Components & Patterns

| Component/Pattern | Source | Usage |
|-------------------|--------|-------|
| `StatCard` | `src/features/dashboard/components/StatCard.tsx` | MetricCards에서 4개 사용 |
| `PeriodSelector` | `src/features/dashboard/components/PeriodSelector.tsx` | 기간 선택 (7d/30d/90d) |
| `Card`, `CardHeader`, `CardContent` | `src/components/ui/Card.tsx` | 모든 차트 래퍼 |
| `cn()` utility | `src/lib/utils.ts` | className 결합 |
| `bkend.get/post` | `src/lib/bkend.ts` | DB CRUD |
| `getMeServer()` | `src/lib/auth.ts` | API 인증 |
| `useAppStore` | `src/lib/store.ts` | orgId, currentUser |
| Recharts gradient pattern | `CostTrendChart.tsx` | ActiveUsersChart gradient |
| API route pattern | `dashboard/summary/route.ts` | 인증 + orgId 패턴 |

## 10. Error Handling

| Scenario | Handling |
|----------|----------|
| 이벤트 전송 실패 | Silent fail — 분석은 UX에 영향 없어야 함 |
| API 인증 실패 | 401 반환, 클라이언트에서 error 상태 표시 |
| Rate limit 초과 | 429 반환, 클라이언트에서 자동 재시도 없음 |
| DB 쿼리 실패 | 500 반환, error 메시지 로깅 |
| 데이터 없음 | 빈 배열/0 값 반환, UI에서 "데이터 부족" 메시지 |
| sendBeacon 미지원 | fetch fallback 사용 |
| SSR 환경 | AnalyticsProvider가 window 체크 후 no-op |
