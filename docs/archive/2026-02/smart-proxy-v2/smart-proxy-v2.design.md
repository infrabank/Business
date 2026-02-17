# Smart Proxy v2 - Design Document

> Feature: smart-proxy-v2
> Phase: Design
> Created: 2026-02-17
> Plan Reference: `docs/01-plan/features/smart-proxy-v2.plan.md`

## 1. Implementation Overview

4 phases, 8 features. This document specifies the exact files, APIs, types, and components for each.

```
Phase 1 (Foundation):  F5 → F2 → F3
Phase 2 (Analytics):   F1 → F4
Phase 3 (Intelligence): F7 → F6
Phase 4 (Multi-provider): F8
```

---

## 2. Phase 1: Foundation

### F5: Centralized Pricing Service

**Goal**: Single source of truth for model pricing. Remove duplicated `PRICING` objects.

#### 2.1.1 Refactor `src/services/pricing.service.ts`

Current file handles pricing lookups. Extend it to:

```typescript
// src/services/pricing.service.ts

interface ModelPrice {
  model: string
  provider: ProviderType
  inputPricePerMillion: number
  outputPricePerMillion: number
  updatedAt: string
}

// In-memory cache with TTL
let priceCache: Map<string, ModelPrice> | null = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// Hardcoded fallback (same data currently in proxy-forward and model-router)
const FALLBACK_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  'o3-mini': { input: 1.1, output: 4.4 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-pro': { input: 1.25, output: 5 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
}

export async function getModelPricing(model: string): Promise<{ input: number; output: number }>
export function getModelPricingSync(model: string): { input: number; output: number }
export function computeCost(model: string, inputTokens: number, outputTokens: number): number
export async function refreshPriceCache(): Promise<void>
export function getAllPricing(): Record<string, { input: number; output: number }>
```

**Logic**:
- `getModelPricing()` — async, tries cache → DB → fallback
- `getModelPricingSync()` — sync, tries cache → fallback only (for hot path in proxy forwarding)
- `computeCost()` — uses sync pricing, `(input * price.input + output * price.output) / 1_000_000`
- DB source: `model_pricing` table (already in schema)

#### 2.1.2 Files to Modify

| File | Change |
|------|--------|
| `src/services/pricing.service.ts` | Add cache layer, DB lookup, `computeCost()`, `getModelPricingSync()` |
| `src/services/proxy/proxy-forward.service.ts` | Remove local `PRICING` + `computeCost()`, import from pricing.service |
| `src/services/proxy/model-router.service.ts` | Remove local `PRICING`, import from pricing.service |

---

### F2: Distributed Rate Limiter

**Goal**: Replace in-memory `Map` with Redis sliding window.

#### 2.2.1 Shared Redis Module

Extract Redis client to shared module (currently duplicated concept in cache.service.ts):

```typescript
// src/services/proxy/redis.ts

import { Redis } from '@upstash/redis'

let redis: Redis | null = null

export function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}
```

#### 2.2.2 Refactor `src/services/proxy/rate-limiter.ts`

```typescript
// New rate limiter interface (same as current)
export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetMs: number
}

export async function checkRateLimit(
  proxyKeyId: string,
  maxRequestsPerMinute: number | null,
): Promise<RateLimitResult>  // NOTE: now async

export function buildRateLimitResponse(result: RateLimitResult): Response
```

**Redis implementation**:
```
Key:    lcm:rl:{proxyKeyId}:{Math.floor(Date.now() / 60000)}
Op:     INCR + EXPIRE 120
Check:  if count > limit → denied
```

**Fallback**: Keep current in-memory `Map` when Redis unavailable. Same API signature.

**Breaking change**: `checkRateLimit` becomes `async`. Callers (3 proxy route handlers) must `await`.

#### 2.2.3 Files to Modify

| File | Change |
|------|--------|
| `src/services/proxy/redis.ts` | **NEW** — shared Redis client |
| `src/services/proxy/rate-limiter.ts` | Rewrite: Redis primary, in-memory fallback, async API |
| `src/services/proxy/cache.service.ts` | Import `getRedis` from `redis.ts` instead of local |
| `src/app/api/proxy/openai/[...path]/route.ts` | `await checkRateLimit(...)` |
| `src/app/api/proxy/anthropic/[...path]/route.ts` | `await checkRateLimit(...)` |
| `src/app/api/proxy/google/[...path]/route.ts` | `await checkRateLimit(...)` |

---

### F3: Pre-aggregated Budget Counter

**Goal**: O(1) budget checks via Redis counter.

#### 2.3.1 Refactor `src/services/proxy/budget-check.service.ts`

```typescript
export interface BudgetCheckResult {
  allowed: boolean
  currentSpend: number
  budgetLimit: number
  remainingBudget: number
}

// O(1) check via Redis GET
export async function checkBudget(
  orgId: string,
  proxyKeyId: string,
  budgetLimit: number | null,
): Promise<BudgetCheckResult>

// Called after request completes to update counter
export async function incrementBudgetSpend(
  proxyKeyId: string,
  cost: number,
): Promise<void>

// Reconciliation: recalculate from proxy_logs (for cron)
export async function reconcileBudgetCounter(
  proxyKeyId: string,
  orgId: string,
): Promise<void>
```

**Redis keys**:
```
Budget counter:  lcm:budget:{proxyKeyId}:{YYYY-MM}   TTL: 45 days
```

**Operations**:
- `checkBudget()`: `GET lcm:budget:{id}:{month}` → compare with limit
- `incrementBudgetSpend()`: `INCRBYFLOAT lcm:budget:{id}:{month} cost` + `EXPIRE 45d` (if new)
- Fallback: Query `proxy_logs` (current behavior) when Redis unavailable

#### 2.3.2 Integration in proxy-forward.service.ts

After logging each request, call `incrementBudgetSpend()`:

```typescript
// In proxy-forward.service.ts, after logProxyRequest()
incrementBudgetSpend(resolvedKey.id, cost).catch(() => {})
```

#### 2.3.3 Reconciliation Cron

New API route: `src/app/api/cron/reconcile-budgets/route.ts`

```typescript
// GET /api/cron/reconcile-budgets?secret=CRON_SECRET
// Runs daily, recalculates budget counters from proxy_logs for all active keys
```

#### 2.3.4 Files to Modify

| File | Change |
|------|--------|
| `src/services/proxy/budget-check.service.ts` | Rewrite: Redis counter + increment + reconciliation |
| `src/services/proxy/proxy-forward.service.ts` | Add `incrementBudgetSpend()` call after logging |
| `src/app/api/cron/reconcile-budgets/route.ts` | **NEW** — daily budget reconciliation cron |

---

## 3. Phase 2: Analytics & Alerts

### F1: Analytics Dashboard

**Goal**: Time-series cost charts, per-model/per-key breakdown.

#### 3.1.1 New API Routes

**`src/app/api/proxy/analytics/timeseries/route.ts`**

```typescript
// GET /api/proxy/analytics/timeseries?orgId=xxx&period=30d&groupBy=day
// Response:
interface TimeseriesPoint {
  date: string           // YYYY-MM-DD
  totalCost: number
  totalSaved: number
  requestCount: number
  cacheHits: number
  modelRoutings: number
}
// Returns: TimeseriesPoint[]
```

Implementation: Query `proxy_logs` with date range, aggregate in application code using `reduce()` grouping by date.

**`src/app/api/proxy/analytics/breakdown/route.ts`**

```typescript
// GET /api/proxy/analytics/breakdown?orgId=xxx&period=30d&by=model|provider|key
// Response:
interface BreakdownItem {
  name: string           // model name, provider type, or key name
  totalCost: number
  totalSaved: number
  requestCount: number
  avgLatencyMs: number
  cacheHitRate: number
}
// Returns: BreakdownItem[]
```

#### 3.1.2 New Types

```typescript
// src/types/proxy-analytics.ts

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
```

#### 3.1.3 New Hook

```typescript
// src/features/proxy/hooks/useProxyAnalytics.ts

export function useProxyAnalytics(options: {
  orgId: string | null
  period: AnalyticsPeriod
  breakdownBy: BreakdownType
}): {
  timeseries: TimeseriesPoint[]
  breakdown: BreakdownItem[]
  isLoading: boolean
  error: string | null
}
```

Fetches both timeseries and breakdown in parallel via `Promise.all`.

#### 3.1.4 New Components

**`src/features/proxy/components/ProxyCostTrendChart.tsx`**

- Recharts `AreaChart` with dual areas: cost (blue) and savings (green)
- X-axis: dates, Y-axis: USD
- Tooltip showing cost, savings, request count
- Period selector passed as prop

**`src/features/proxy/components/ModelBreakdownChart.tsx`**

- Recharts `BarChart` horizontal, sorted by cost descending
- Each bar shows cost + savings stacked
- Click to filter timeseries by that model

**`src/features/proxy/components/KeyBreakdownTable.tsx`**

- Table showing per-key metrics: name, cost, savings, requests, cache hit rate, avg latency
- Sortable columns
- Uses existing `DataTable` component from `src/components/ui/DataTable.tsx`

#### 3.1.5 Proxy Page Update

Add `analytics` tab to existing proxy page tabs (`keys | savings | analytics | logs`):

```typescript
// src/app/(dashboard)/proxy/page.tsx
// Add 'analytics' to activeTab type
const [activeTab, setActiveTab] = useState<'keys' | 'savings' | 'analytics' | 'logs'>('keys')
```

Analytics tab layout:
```
┌─────────────────────────────────────────────┐
│ [Period: 7d | 30d | 90d]  [By: Model | Provider | Key] │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │  Cost Trend Chart (AreaChart)           │ │
│ │  - Blue area: actual cost              │ │
│ │  - Green area: savings                 │ │
│ └─────────────────────────────────────────┘ │
│ ┌──────────────────┐ ┌──────────────────┐  │
│ │ Breakdown Chart  │ │ Key Breakdown    │  │
│ │ (BarChart)       │ │ Table            │  │
│ └──────────────────┘ └──────────────────┘  │
└─────────────────────────────────────────────┘
```

#### 3.1.6 Files Summary

| File | Type | Description |
|------|------|-------------|
| `src/types/proxy-analytics.ts` | **NEW** | Analytics types |
| `src/app/api/proxy/analytics/timeseries/route.ts` | **NEW** | Timeseries API |
| `src/app/api/proxy/analytics/breakdown/route.ts` | **NEW** | Breakdown API |
| `src/features/proxy/hooks/useProxyAnalytics.ts` | **NEW** | Analytics data hook |
| `src/features/proxy/components/ProxyCostTrendChart.tsx` | **NEW** | Time-series area chart |
| `src/features/proxy/components/ModelBreakdownChart.tsx` | **NEW** | Model breakdown bar chart |
| `src/features/proxy/components/KeyBreakdownTable.tsx` | **NEW** | Per-key metrics table |
| `src/app/(dashboard)/proxy/page.tsx` | **MODIFY** | Add analytics tab |
| `src/types/index.ts` | **MODIFY** | Re-export proxy-analytics types |

---

### F4: Budget Alert System

**Goal**: Proactive budget threshold notifications.

#### 3.2.1 Type Extensions

```typescript
// Extend ProxyKey type in src/types/proxy.ts
export interface ProxyKey {
  // ... existing fields ...
  budgetAlertThresholds: number[]  // e.g., [0.8, 0.9, 1.0]
  budgetAlertsEnabled: boolean
}
```

#### 3.2.2 Alert Trigger Service

```typescript
// src/services/proxy/budget-alert.service.ts

export async function checkBudgetAlerts(
  proxyKeyId: string,
  orgId: string,
  currentSpend: number,
  budgetLimit: number,
  thresholds: number[],
): Promise<void>
```

**Logic**:
1. For each threshold, calculate `budgetLimit * threshold`
2. If `currentSpend >= threshold_amount`:
   - Check Redis dedup key: `lcm:budget-alert:{keyId}:{YYYY-MM}:{threshold}`
   - If not exists → create alert + set dedup key (TTL 45d)
3. Alert creation: insert into `alerts` table using existing alert system
   - `type: 'budget_threshold'`
   - `message: "프록시 키 '{name}' 예산 {threshold*100}% 도달 ($X / $Y)"`

#### 3.2.3 Integration Point

In `budget-check.service.ts`, after `incrementBudgetSpend()`:

```typescript
// Fire-and-forget alert check
if (budgetAlertsEnabled && budgetLimit) {
  checkBudgetAlerts(proxyKeyId, orgId, newSpend, budgetLimit, alertThresholds).catch(() => {})
}
```

#### 3.2.4 UI: ProxyKeyForm Extension

Add to `src/features/proxy/components/ProxyKeyForm.tsx`:
- Toggle: "예산 알림 활성화"
- Multi-select checkboxes: 80%, 90%, 100% thresholds

#### 3.2.5 Files Summary

| File | Type | Description |
|------|------|-------------|
| `src/services/proxy/budget-alert.service.ts` | **NEW** | Alert trigger logic |
| `src/types/proxy.ts` | **MODIFY** | Add alertThresholds, alertsEnabled to ProxyKey |
| `src/services/proxy/budget-check.service.ts` | **MODIFY** | Integrate alert check after spend increment |
| `src/features/proxy/components/ProxyKeyForm.tsx` | **MODIFY** | Alert config fields |
| `src/services/proxy/proxy-forward.service.ts` | **MODIFY** | Pass alert config to budget increment |

---

## 4. Phase 3: Intelligence

### F7: Routing Quality Tracking

**Goal**: Track routing decisions and collect user feedback.

#### 4.1.1 Extend proxy_logs

```typescript
// Additional fields in ProxyLog (src/types/proxy.ts)
export interface ProxyLog {
  // ... existing fields ...
  routingDecision: {
    intent: string
    confidence: number
    reason: string
    wasRouted: boolean
  } | null
  userFeedback: 'positive' | 'negative' | null
}
```

#### 4.1.2 Log Routing Decision

In `proxy-forward.service.ts`, extend `logProxyRequest()` to include routing decision data from `routeModel()` result.

#### 4.1.3 Feedback API

```typescript
// src/app/api/proxy/logs/[id]/feedback/route.ts

// POST /api/proxy/logs/:id/feedback
// Body: { feedback: 'positive' | 'negative' }
// Updates proxy_logs.userFeedback
```

#### 4.1.4 Quality Score Aggregation

```typescript
// src/services/proxy/routing-quality.service.ts

export interface RoutingQualityScore {
  modelPair: string          // "gpt-4o→gpt-4o-mini"
  totalRouted: number
  positiveFeedback: number
  negativeFeedback: number
  qualityScore: number       // positive / (positive + negative), or 1.0 if no feedback
}

export async function getRoutingQualityScores(orgId: string): Promise<RoutingQualityScore[]>
export async function shouldDisableRouting(originalModel: string, routedModel: string, orgId: string): Promise<boolean>
```

#### 4.1.5 UI: Feedback Buttons on ProxyLogTable

Add thumbs-up/thumbs-down buttons on routed request rows in `ProxyLogTable.tsx`.

#### 4.1.6 Files Summary

| File | Type | Description |
|------|------|-------------|
| `src/types/proxy.ts` | **MODIFY** | Add routingDecision, userFeedback to ProxyLog |
| `src/services/proxy/proxy-forward.service.ts` | **MODIFY** | Log routing decision data |
| `src/app/api/proxy/logs/[id]/feedback/route.ts` | **NEW** | Feedback API |
| `src/services/proxy/routing-quality.service.ts` | **NEW** | Quality score aggregation |
| `src/features/proxy/components/ProxyLogTable.tsx` | **MODIFY** | Add feedback buttons |

---

### F6: Routing Rules UI

**Goal**: User-configurable routing rules per proxy key.

#### 4.2.1 Type Extension

```typescript
// Extend ProxyKey in src/types/proxy.ts
export interface RoutingRule {
  fromModel: string
  toModel: string
  condition: 'always' | 'simple-only' | 'short-only'
}

export interface ProxyKey {
  // ... existing fields ...
  routingMode: 'auto' | 'manual' | 'off'
  routingRules: RoutingRule[]
}
```

#### 4.2.2 Model Router Integration

In `model-router.service.ts`, add `routingRules` parameter to `routeModel()`:

```typescript
export async function routeModel(
  originalModel: string,
  body: Record<string, unknown>,
  enableRouting: boolean,
  routingMode?: 'auto' | 'manual' | 'off',
  manualRules?: RoutingRule[],
): Promise<RoutingResult>
```

When `routingMode === 'manual'`:
- Check `manualRules` for matching `fromModel`
- Apply condition check (always → route, simple-only → check intent, short-only → check tokens)
- Skip hybrid intent classification

#### 4.2.3 UI: RoutingRulesEditor Component

```typescript
// src/features/proxy/components/RoutingRulesEditor.tsx

interface Props {
  routingMode: 'auto' | 'manual' | 'off'
  rules: RoutingRule[]
  onChange: (mode: string, rules: RoutingRule[]) => void
}
```

Layout:
```
┌─────────────────────────────────────────────┐
│ 라우팅 모드: [자동 | 수동 | 끄기]           │
├─────────────────────────────────────────────┤
│ (when manual)                               │
│ ┌─────────────┬──────────────┬───────────┐  │
│ │ From Model  │ To Model     │ Condition │  │
│ ├─────────────┼──────────────┼───────────┤  │
│ │ gpt-4o      │ gpt-4o-mini  │ simple    │  │
│ │ claude-opus │ claude-sonnet│ always    │  │
│ └─────────────┴──────────────┴───────────┘  │
│ [+ 규칙 추가]                                │
└─────────────────────────────────────────────┘
```

Integrate into `ProxyKeyForm.tsx` as collapsible section.

#### 4.2.4 Files Summary

| File | Type | Description |
|------|------|-------------|
| `src/types/proxy.ts` | **MODIFY** | Add RoutingRule, routingMode, routingRules |
| `src/services/proxy/model-router.service.ts` | **MODIFY** | Support manual routing rules |
| `src/features/proxy/components/RoutingRulesEditor.tsx` | **NEW** | Routing rules configuration UI |
| `src/features/proxy/components/ProxyKeyForm.tsx` | **MODIFY** | Embed RoutingRulesEditor |
| `src/services/proxy/proxy-forward.service.ts` | **MODIFY** | Pass routing config to routeModel |

---

## 5. Phase 4: Multi-provider Keys

### F8: Multi-provider Keys

**Goal**: Single proxy key that auto-detects provider from request format.

#### 5.1.1 Provider Detection

```typescript
// src/services/proxy/provider-detect.service.ts

export type DetectedProvider = ProviderType | null

export function detectProvider(
  body: Record<string, unknown>,
  path: string,
): DetectedProvider
```

**Detection logic**:
1. Check `body.model`:
   - Starts with `gpt-` / `o1` / `o3` → `openai`
   - Starts with `claude-` → `anthropic`
   - Starts with `gemini-` → `google`
2. Check request format:
   - Has `messages` array + no `anthropic-version` header → `openai`
   - Has `messages` array + `system` top-level string → `anthropic`
   - Has `contents` array → `google`
3. Check path hints:
   - Contains `chat/completions` → `openai`
   - Contains `messages` → `anthropic`
   - Contains `generateContent` → `google`

#### 5.1.2 Unified Proxy Route

```typescript
// src/app/api/proxy/v2/[...path]/route.ts

// Accepts any provider format
// Uses provider-detect to determine target
// Resolves proxy key → verifies providerType is 'auto' or matches detected
// Forwards to appropriate provider
```

#### 5.1.3 ProxyKey Type Extension

```typescript
// In src/types/proxy.ts, extend ProviderType
// ProviderType already includes 'openai' | 'anthropic' | 'google'
// Add 'auto' variant for multi-provider keys

export interface ProxyKey {
  // ... existing fields ...
  providerType: ProviderType | 'auto'
  // When 'auto', need at least one encrypted API key per provider:
  providerApiKeys?: Record<ProviderType, string>  // encrypted keys per provider
}
```

#### 5.1.4 Files Summary

| File | Type | Description |
|------|------|-------------|
| `src/services/proxy/provider-detect.service.ts` | **NEW** | Auto-detect provider from request |
| `src/app/api/proxy/v2/[...path]/route.ts` | **NEW** | Unified proxy endpoint |
| `src/types/proxy.ts` | **MODIFY** | Add 'auto' to providerType |
| `src/types/provider.ts` | **MODIFY** | Consider 'auto' variant |
| `src/features/proxy/components/ProxyKeyForm.tsx` | **MODIFY** | Support multi-provider key creation |

---

## 6. Complete File Change Summary

### New Files (16)

| # | File | Phase |
|---|------|-------|
| 1 | `src/services/proxy/redis.ts` | P1 |
| 2 | `src/app/api/cron/reconcile-budgets/route.ts` | P1 |
| 3 | `src/types/proxy-analytics.ts` | P2 |
| 4 | `src/app/api/proxy/analytics/timeseries/route.ts` | P2 |
| 5 | `src/app/api/proxy/analytics/breakdown/route.ts` | P2 |
| 6 | `src/features/proxy/hooks/useProxyAnalytics.ts` | P2 |
| 7 | `src/features/proxy/components/ProxyCostTrendChart.tsx` | P2 |
| 8 | `src/features/proxy/components/ModelBreakdownChart.tsx` | P2 |
| 9 | `src/features/proxy/components/KeyBreakdownTable.tsx` | P2 |
| 10 | `src/services/proxy/budget-alert.service.ts` | P2 |
| 11 | `src/app/api/proxy/logs/[id]/feedback/route.ts` | P3 |
| 12 | `src/services/proxy/routing-quality.service.ts` | P3 |
| 13 | `src/features/proxy/components/RoutingRulesEditor.tsx` | P3 |
| 14 | `src/services/proxy/provider-detect.service.ts` | P4 |
| 15 | `src/app/api/proxy/v2/[...path]/route.ts` | P4 |

### Modified Files (14)

| # | File | Phase | Change |
|---|------|-------|--------|
| 1 | `src/services/pricing.service.ts` | P1 | Cache layer, DB lookup, computeCost, sync API |
| 2 | `src/services/proxy/proxy-forward.service.ts` | P1-P3 | Import centralized pricing, add budget increment, log routing decisions |
| 3 | `src/services/proxy/model-router.service.ts` | P1,P3 | Import centralized pricing, support manual rules |
| 4 | `src/services/proxy/rate-limiter.ts` | P1 | Redis sliding window, async API |
| 5 | `src/services/proxy/cache.service.ts` | P1 | Import shared Redis client |
| 6 | `src/services/proxy/budget-check.service.ts` | P1-P2 | Redis counter, increment, alert integration |
| 7 | `src/app/api/proxy/openai/[...path]/route.ts` | P1 | Await async rate limiter |
| 8 | `src/app/api/proxy/anthropic/[...path]/route.ts` | P1 | Await async rate limiter |
| 9 | `src/app/api/proxy/google/[...path]/route.ts` | P1 | Await async rate limiter |
| 10 | `src/types/proxy.ts` | P2-P4 | Alert fields, routing fields, feedback, auto provider |
| 11 | `src/types/index.ts` | P2 | Re-export proxy-analytics types |
| 12 | `src/app/(dashboard)/proxy/page.tsx` | P2 | Add analytics tab |
| 13 | `src/features/proxy/components/ProxyKeyForm.tsx` | P2-P4 | Alert config, routing rules, multi-provider |
| 14 | `src/features/proxy/components/ProxyLogTable.tsx` | P3 | Feedback buttons |

---

## 7. Error Handling Strategy

| Scenario | Handling | Rationale |
|----------|----------|-----------|
| Redis unavailable | Fall back to in-memory (rate limiter) or DB query (budget) | Fail-open: don't block requests |
| Budget counter drift | Daily reconciliation cron corrects drift | Eventual consistency acceptable |
| Analytics query timeout | Return partial data with warning flag | UX > accuracy for dashboards |
| Provider detection fails (F8) | Return 400 with "Cannot detect provider" + format hints | Clear error message |
| Feedback on non-routed log | Return 400 "Feedback only for routed requests" | Validation |

## 8. Testing Strategy

| Feature | Test Type | Approach |
|---------|-----------|----------|
| Pricing service | Unit | Verify cache TTL, fallback logic, computeCost accuracy |
| Rate limiter | Integration | Redis mock, test sliding window boundary, fallback path |
| Budget counter | Integration | Redis mock, test INCRBYFLOAT, reconciliation |
| Analytics APIs | API | Seed proxy_logs, verify aggregation output |
| Budget alerts | Integration | Verify threshold detection, dedup via Redis key |
| Routing quality | Unit | Score calculation, disable threshold |
| Provider detection | Unit | Test all 3 provider formats + edge cases |

## 9. Database Migrations

### Supabase SQL (to be run via dashboard)

```sql
-- F4: Budget alert fields on proxy_keys
ALTER TABLE proxy_keys
  ADD COLUMN IF NOT EXISTS budget_alert_thresholds jsonb DEFAULT '[0.8, 0.9, 1.0]',
  ADD COLUMN IF NOT EXISTS budget_alerts_enabled boolean DEFAULT false;

-- F7: Routing tracking on proxy_logs
ALTER TABLE proxy_logs
  ADD COLUMN IF NOT EXISTS routing_decision jsonb DEFAULT null,
  ADD COLUMN IF NOT EXISTS user_feedback text DEFAULT null;

-- F6: Routing rules on proxy_keys
ALTER TABLE proxy_keys
  ADD COLUMN IF NOT EXISTS routing_mode text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS routing_rules jsonb DEFAULT '[]';

-- F8: Multi-provider keys
ALTER TABLE proxy_keys
  ADD COLUMN IF NOT EXISTS provider_api_keys jsonb DEFAULT null;
```

## 10. Implementation Order (Detailed)

```
Week 1: Phase 1 Foundation
  Day 1: F5 - Centralized pricing (3 files)
  Day 2: F2 - Shared Redis + distributed rate limiter (6 files)
  Day 3: F3 - Pre-aggregated budget counter + reconciliation cron (3 files)
  Day 3: Run build, verify no regressions

Week 2: Phase 2 Analytics + Alerts
  Day 4: F1 - Analytics API routes + types (4 files)
  Day 5: F1 - Analytics components + hook + page integration (5 files)
  Day 6: F4 - Budget alert service + ProxyKeyForm extension (5 files)
  Day 6: Run build, verify analytics page renders

Week 3: Phase 3 Intelligence
  Day 7: F7 - Routing quality tracking + feedback API (5 files)
  Day 8: F6 - Routing rules UI + model router integration (5 files)
  Day 8: Run build, verify routing config works

Week 4: Phase 4 Multi-provider (optional)
  Day 9: F8 - Provider detection + unified route + key form (5 files)
  Day 9: Run build, full regression check
```
