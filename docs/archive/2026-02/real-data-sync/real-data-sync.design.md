# 실시간 프로바이더 데이터 동기화 (real-data-sync) Design Document

> **Summary**: Provider Adapter의 mock 데이터를 실제 API로 교체하고, 동기화 이력/스케줄/에러 핸들링/가격 DB를 구현
>
> **Project**: LLM Cost Manager
> **Version**: 0.1.0
> **Author**: Solo Founder
> **Date**: 2026-02-15
> **Status**: Draft
> **Plan Reference**: [real-data-sync.plan.md](../../01-plan/features/real-data-sync.plan.md)

---

## 1. Architecture Overview

### 1.1 System Flow

```
┌────────────────┐       ┌────────────────────┐       ┌─────────────────┐
│  UI Layer      │       │  API Layer         │       │  External APIs  │
│                │       │                    │       │                 │
│ SyncButton ────┼──────→│ /api/sync/trigger  │       │ OpenAI Usage    │
│ SyncHistory    │       │ /api/sync/schedule │──────→│ Anthropic Admin │
│ ProviderDetail │       │ /api/sync/history  │       │ Google Billing  │
└────────────────┘       └────────┬───────────┘       └─────────────────┘
                                  │
                         ┌────────▼───────────┐
                         │  Service Layer     │
                         │                    │
                         │ usage-sync.service │
                         │ pricing.service    │
                         │ Provider Adapters  │
                         └────────┬───────────┘
                                  │
                         ┌────────▼───────────┐
                         │  Data Layer        │
                         │                    │
                         │ bkend.ai DB        │
                         │ - usage_records    │
                         │ - sync_histories   │
                         │ - model_pricings   │
                         └────────────────────┘
```

### 1.2 Sync Flow (Detailed)

```
1. Trigger (Manual or Cron)
   │
2. ├─→ Create SyncHistory (status: running)
   │
3. ├─→ For each active Provider:
   │     ├─→ Get API Keys (encrypted)
   │     ├─→ Decrypt keys
   │     ├─→ Rate Limit Check (wait if needed)
   │     ├─→ Call Provider API (fetchUsage)
   │     ├─→ Parse response → UsageData[]
   │     ├─→ Get pricing from ModelPricing DB
   │     ├─→ Calculate costs
   │     └─→ Upsert UsageRecords (date+model+apiKeyId)
   │
4. ├─→ Update SyncHistory (status: success/failed/partial)
   │
5. └─→ Check Budget Thresholds → Generate Alerts
```

---

## 2. Data Model Changes

### 2.1 New: SyncHistory Table (bkend.ai)

**Table name**: `sync_histories`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, auto | Record ID |
| orgId | text | NOT NULL, FK→organizations | Organization |
| providerId | text | NOT NULL, FK→providers | Provider |
| providerType | text | NOT NULL | openai/anthropic/google |
| syncType | text | NOT NULL | manual/scheduled/retry |
| status | text | NOT NULL | running/success/failed/partial |
| fromDate | text | NOT NULL | YYYY-MM-DD |
| toDate | text | NOT NULL | YYYY-MM-DD |
| recordsCreated | number | DEFAULT 0 | New records |
| recordsUpdated | number | DEFAULT 0 | Updated records |
| errorMessage | text | NULL | Error detail |
| durationMs | number | DEFAULT 0 | Duration in ms |
| startedAt | datetime | NOT NULL | Start time |
| completedAt | datetime | NULL | End time |

### 2.2 New: ModelPricing Table (bkend.ai)

**Table name**: `model_pricings`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, auto | Record ID |
| providerType | text | NOT NULL | openai/anthropic/google |
| model | text | NOT NULL | Model name |
| inputPricePer1M | number | NOT NULL | $/1M input tokens |
| outputPricePer1M | number | NOT NULL | $/1M output tokens |
| effectiveFrom | text | NOT NULL | YYYY-MM-DD |
| effectiveTo | text | NULL | YYYY-MM-DD (null=current) |
| createdAt | datetime | NOT NULL | Created timestamp |

**Unique constraint**: `(providerType, model, effectiveFrom)`

### 2.3 Modified: UsageRecord

Add optional field:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| syncHistoryId | text | NULL, FK→sync_histories | Source sync reference |

---

## 3. TypeScript Type Definitions

### 3.1 New File: `types/sync.ts`

```typescript
import type { ProviderType } from './provider'

export type SyncType = 'manual' | 'scheduled' | 'retry'
export type SyncStatus = 'running' | 'success' | 'failed' | 'partial'

export interface SyncHistory {
  id: string
  orgId: string
  providerId: string
  providerType: ProviderType
  syncType: SyncType
  status: SyncStatus
  fromDate: string
  toDate: string
  recordsCreated: number
  recordsUpdated: number
  errorMessage?: string
  durationMs: number
  startedAt: string
  completedAt?: string
}

export interface ModelPricing {
  id: string
  providerType: ProviderType
  model: string
  inputPricePer1M: number
  outputPricePer1M: number
  effectiveFrom: string
  effectiveTo?: string
  createdAt: string
}

export interface SyncTriggerRequest {
  orgId: string
  providerId?: string  // optional: sync specific provider only
  fromDate?: string    // optional: default last 24h
  toDate?: string      // optional: default now
}

export interface SyncTriggerResponse {
  syncHistoryId: string
  sync: SyncResult[]
  alerts: import('./alert').Alert[]
  syncedAt: string
}

export interface SyncResult {
  providerId: string
  providerType: ProviderType
  recordsCreated: number
  recordsUpdated: number
  status: SyncStatus
  error?: string
  durationMs: number
}
```

### 3.2 Updated: `types/index.ts`

```typescript
// Add export
export * from './sync'
```

---

## 4. Provider Adapter Changes

### 4.1 Base Adapter Interface Updates

**File**: `services/providers/base-adapter.ts`

```typescript
import type { ProviderType } from '@/types'

export interface UsageData {
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
  requestCount: number
  date: string
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number
  delayBetweenRequestsMs: number
}

export interface FetchUsageOptions {
  bucketWidth?: '1h' | '1d'
  page?: number
  limit?: number
}

export interface FetchUsageResult {
  data: UsageData[]
  hasMore: boolean
  nextPage?: number
}

export interface ProviderAdapter {
  type: ProviderType
  rateLimitConfig: RateLimitConfig
  validateKey(apiKey: string): Promise<boolean>
  fetchUsage(apiKey: string, from: Date, to: Date, options?: FetchUsageOptions): Promise<FetchUsageResult>
  getAvailableModels(): string[]
  supportsUsageApi(): boolean
}
```

### 4.2 OpenAI Adapter Redesign

**File**: `services/providers/openai-adapter.ts`

**Changes**:
- Remove `generateMockData()` method entirely
- Add pagination support via `FetchUsageResult.hasMore`
- Add `RateLimitConfig`: 60 req/min → 1000ms delay
- Handle error codes: 401 (invalid key), 429 (rate limit), 403 (not admin key)
- `supportsUsageApi()` returns `true`

**Key Implementation**:
```typescript
async fetchUsage(apiKey: string, from: Date, to: Date, options?: FetchUsageOptions): Promise<FetchUsageResult> {
  const params = new URLSearchParams({
    start_time: String(Math.floor(from.getTime() / 1000)),
    end_time: String(Math.floor(to.getTime() / 1000)),
    group_by: 'model',
    bucket_width: options?.bucketWidth ?? '1d',
    limit: String(options?.limit ?? 100),
  })
  if (options?.page) params.set('page', String(options.page))

  const res = await fetch(`https://api.openai.com/v1/organization/usage/completions?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new ProviderApiError(res.status, errBody.error?.message ?? res.statusText, 'openai')
  }

  const data = await res.json()
  return {
    data: this.parseUsageData(data),
    hasMore: data.has_more ?? false,
    nextPage: data.next_page,
  }
}
```

### 4.3 Anthropic Adapter Redesign

**File**: `services/providers/anthropic-adapter.ts`

**Changes**:
- Remove `generateMockData()` method entirely
- Implement Admin API usage endpoint call
- `supportsUsageApi()` returns `true` (with caveat: requires admin key)
- Handle 401/403 gracefully with clear error message

**Key Implementation**:
```typescript
async fetchUsage(apiKey: string, from: Date, to: Date): Promise<FetchUsageResult> {
  const params = new URLSearchParams({
    start_date: from.toISOString().split('T')[0],
    end_date: to.toISOString().split('T')[0],
    group_by: 'model',
  })

  const res = await fetch(`https://api.anthropic.com/v1/organizations/usage?${params}`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  })

  if (res.status === 401 || res.status === 403) {
    throw new ProviderApiError(res.status, 'Anthropic Admin API key required for usage data. Please use an Admin API key.', 'anthropic')
  }

  if (!res.ok) {
    throw new ProviderApiError(res.status, `Anthropic API error: ${res.statusText}`, 'anthropic')
  }

  const data = await res.json()
  return { data: this.parseUsageData(data), hasMore: false }
}
```

### 4.4 Google Adapter Redesign

**File**: `services/providers/google-adapter.ts`

**Changes**:
- Remove `generateMockData()` method entirely
- `supportsUsageApi()` returns `false` (no standard usage API)
- `fetchUsage()` throws descriptive error explaining limitations
- Future: Cloud Billing API support

**Key Implementation**:
```typescript
async fetchUsage(_apiKey: string, _from: Date, _to: Date): Promise<FetchUsageResult> {
  throw new ProviderApiError(
    501,
    'Google AI does not provide a standard usage API. Usage data can be imported via CSV or entered manually.',
    'google'
  )
}

supportsUsageApi(): boolean {
  return false
}
```

### 4.5 New: ProviderApiError Class

**File**: `services/providers/base-adapter.ts` (addition)

```typescript
export class ProviderApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public provider: string,
  ) {
    super(message)
    this.name = 'ProviderApiError'
  }
}
```

---

## 5. Service Layer Changes

### 5.1 Usage Sync Service Redesign

**File**: `services/usage-sync.service.ts`

**Major Changes**:
1. Add SyncHistory creation/update
2. Add upsert logic (replace simple insert)
3. Add retry with exponential backoff
4. Add rate limit delay between requests
5. Add pagination handling for large datasets
6. Handle `ProviderApiError` gracefully

**Redesigned Interface**:

```typescript
interface SyncOptions {
  orgId: string
  token: string
  providerId?: string     // sync specific provider
  fromDate?: Date          // default: yesterday
  toDate?: Date            // default: now
  syncType: SyncType       // manual/scheduled/retry
}

export async function syncProviderUsage(options: SyncOptions): Promise<SyncResult[]>
```

**Upsert Strategy**:
```typescript
async function upsertUsageRecord(record: Partial<UsageRecord>, token: string): Promise<'created' | 'updated'> {
  // Check existing by: orgId + apiKeyId + model + date
  const existing = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: {
      orgId: record.orgId!,
      apiKeyId: record.apiKeyId!,
      model: record.model!,
      date: record.date!,
    },
  })

  if (existing.length > 0) {
    await bkend.patch(`/usage-records/${existing[0].id}`, {
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      totalTokens: record.totalTokens,
      cost: record.cost,
      requestCount: record.requestCount,
      syncHistoryId: record.syncHistoryId,
    }, { token })
    return 'updated'
  }

  await bkend.post('/usage-records', record, { token })
  return 'created'
}
```

**Retry Strategy**:
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 2000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries) throw err
      const delay = baseDelayMs * Math.pow(2, attempt) // 2s, 4s, 8s
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('Unreachable')
}
```

**Rate Limit Delay**:
```typescript
async function rateLimitDelay(adapter: ProviderAdapter): Promise<void> {
  const ms = adapter.rateLimitConfig.delayBetweenRequestsMs
  if (ms > 0) await new Promise(r => setTimeout(r, ms))
}
```

### 5.2 New: Pricing Service

**File**: `services/pricing.service.ts`

```typescript
import { bkend } from '@/lib/bkend'
import type { ModelPricing, ProviderType } from '@/types'

// Fallback pricing (used when DB has no entry)
const FALLBACK_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-pro': { input: 1.25, output: 5 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
}

export async function getModelPricing(
  providerType: ProviderType,
  model: string,
  date: string,
  token: string,
): Promise<{ input: number; output: number }>

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: { input: number; output: number },
): number

export async function seedDefaultPricing(token: string): Promise<number>

export async function updateModelPricing(
  pricing: Omit<ModelPricing, 'id' | 'createdAt'>,
  token: string,
): Promise<ModelPricing>
```

---

## 6. API Route Changes

### 6.1 Modified: `/api/sync/trigger/route.ts`

**Method**: `POST`

**Request Body**:
```json
{
  "orgId": "string (required)",
  "providerId": "string (optional - sync specific provider)",
  "fromDate": "YYYY-MM-DD (optional - default yesterday)",
  "toDate": "YYYY-MM-DD (optional - default today)"
}
```

**Response** (200):
```json
{
  "syncHistoryId": "uuid",
  "sync": [
    {
      "providerId": "uuid",
      "providerType": "openai",
      "recordsCreated": 15,
      "recordsUpdated": 3,
      "status": "success",
      "durationMs": 2340
    }
  ],
  "alerts": [],
  "syncedAt": "2026-02-15T13:00:00.000Z"
}
```

**Response** (partial - some providers failed):
```json
{
  "syncHistoryId": "uuid",
  "sync": [
    { "providerId": "...", "status": "success", "recordsCreated": 15 },
    { "providerId": "...", "status": "failed", "error": "Anthropic Admin API key required" }
  ],
  "syncedAt": "..."
}
```

### 6.2 New: `/api/sync/schedule/route.ts`

**Method**: `POST` (called by Vercel Cron)

**Auth**: `Authorization: Bearer <CRON_SECRET>` (env var, not user token)

**Request**: No body needed (syncs all orgs)

**Implementation**:
```typescript
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all active organizations
  // For each org: syncAllProviders({ syncType: 'scheduled' })
  // Return summary
}
```

**Vercel Cron Config** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/sync/schedule",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### 6.3 New: `/api/sync/history/route.ts`

**Method**: `GET`

**Query Params**:
- `orgId` (required)
- `providerId` (optional)
- `status` (optional: success/failed/partial)
- `limit` (optional, default 20)
- `offset` (optional, default 0)

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "providerId": "uuid",
      "providerType": "openai",
      "syncType": "manual",
      "status": "success",
      "fromDate": "2026-02-14",
      "toDate": "2026-02-15",
      "recordsCreated": 15,
      "recordsUpdated": 3,
      "durationMs": 2340,
      "startedAt": "2026-02-15T13:00:00.000Z",
      "completedAt": "2026-02-15T13:00:02.340Z"
    }
  ],
  "meta": { "total": 42, "limit": 20, "offset": 0 }
}
```

---

## 7. UI Component Design

### 7.1 SyncButton Component

**File**: `features/providers/components/SyncButton.tsx`

**Props**:
```typescript
interface SyncButtonProps {
  providerId: string
  orgId: string
  lastSyncAt?: string
  onSyncComplete?: () => void
}
```

**States**:
- `idle`: "Sync Now" button
- `syncing`: Spinner + "Syncing..." (disabled)
- `success`: Green checkmark + "Synced!" (auto-reset to idle after 3s)
- `error`: Red warning + error message + "Retry" button

**UI Layout**:
```
┌─────────────────────────────────────────────────┐
│ Sync Status                                     │
│ ┌─────────────────────────────┬───────────────┐ │
│ │ Last synced                 │  [Sync Now]   │ │
│ │ Feb 15, 2026 1:00 PM       │  or           │ │
│ │                             │  [Syncing...] │ │
│ └─────────────────────────────┴───────────────┘ │
│                                                 │
│ Provider does not support usage API.            │
│ → Import usage data via CSV (Google only)       │
└─────────────────────────────────────────────────┘
```

### 7.2 SyncHistory Component

**File**: `features/providers/components/SyncHistory.tsx`

**Props**:
```typescript
interface SyncHistoryProps {
  orgId: string
  providerId: string
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────┐
│ Sync History                              [View All] │
│                                                 │
│ ● Feb 15, 1:00 PM  success  +15 / ~3  2.3s    │
│ ● Feb 14, 3:00 AM  success  +12 / ~0  1.8s    │
│ ● Feb 13, 3:00 AM  failed   Rate limit         │
│ ● Feb 12, 3:00 AM  success  +18 / ~2  3.1s    │
│                                                 │
│ ● = status dot (green/red/yellow)              │
│ +N = created, ~N = updated                     │
└─────────────────────────────────────────────────┘
```

### 7.3 Updated: Provider Detail Page

**File**: `app/(dashboard)/providers/[id]/page.tsx`

**Changes**:
- Replace static "Sync Now" button with `<SyncButton />` component
- Add `<SyncHistory />` section below sync status
- Show "Usage API not supported" message for Google with CSV import hint

---

## 8. Constants & Configuration

### 8.1 Updated: `lib/constants.ts`

```typescript
export const SYNC_CONFIG = {
  defaultSyncDays: 1,         // Sync last N days by default
  maxSyncDays: 90,            // Maximum sync range
  maxRetries: 3,              // Retry attempts on failure
  retryBaseDelayMs: 2000,     // Base delay for exponential backoff
  cronSchedule: '0 3 * * *',  // Daily at 3:00 AM UTC
} as const

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  openai: { maxRequestsPerMinute: 60, delayBetweenRequestsMs: 1000 },
  anthropic: { maxRequestsPerMinute: 60, delayBetweenRequestsMs: 1000 },
  google: { maxRequestsPerMinute: 300, delayBetweenRequestsMs: 500 },
} as const
```

---

## 9. File Change Summary

### 9.1 New Files (7)

| # | File | Purpose |
|---|------|---------|
| 1 | `app/src/types/sync.ts` | SyncHistory, ModelPricing types |
| 2 | `app/src/services/pricing.service.ts` | Model pricing DB CRUD + cost calculation |
| 3 | `app/src/app/api/sync/schedule/route.ts` | Cron-triggered auto sync endpoint |
| 4 | `app/src/app/api/sync/history/route.ts` | Sync history query endpoint |
| 5 | `app/src/features/providers/components/SyncButton.tsx` | Manual sync trigger + status UI |
| 6 | `app/src/features/providers/components/SyncHistory.tsx` | Sync history display component |
| 7 | `vercel.json` | Cron schedule configuration |

### 9.2 Modified Files (10)

| # | File | Changes |
|---|------|---------|
| 1 | `services/providers/base-adapter.ts` | + RateLimitConfig, FetchUsageResult, ProviderApiError, supportsUsageApi() |
| 2 | `services/providers/openai-adapter.ts` | Remove mock, add pagination, error handling, rate limit config |
| 3 | `services/providers/anthropic-adapter.ts` | Remove mock, implement Admin API, graceful 401/403 |
| 4 | `services/providers/google-adapter.ts` | Remove mock, throw descriptive error, supportsUsageApi=false |
| 5 | `services/providers/index.ts` | Re-export new types (ProviderApiError, etc.) |
| 6 | `services/usage-sync.service.ts` | Add upsert, SyncHistory, retry, rate limit, pagination loop |
| 7 | `app/api/sync/trigger/route.ts` | Use new SyncOptions, return SyncHistory reference |
| 8 | `app/(dashboard)/providers/[id]/page.tsx` | Integrate SyncButton + SyncHistory components |
| 9 | `types/index.ts` | Add `export * from './sync'` |
| 10 | `lib/constants.ts` | Add SYNC_CONFIG, RATE_LIMITS |

### 9.3 No Change

| File | Reason |
|------|--------|
| `services/encryption.service.ts` | Already working correctly |
| `services/budget.service.ts` | Already works with real data |
| `lib/bkend.ts` | No changes needed |
| `app/api/providers/validate/route.ts` | No changes needed |

---

## 10. Implementation Checklist

### Phase 1: Types & Data Model
- [ ] Create `types/sync.ts` with SyncHistory, ModelPricing, SyncResult types
- [ ] Update `types/index.ts` to export sync types
- [ ] Create `sync_histories` table in bkend.ai
- [ ] Create `model_pricings` table in bkend.ai
- [ ] Add `syncHistoryId` column to `usage_records` table

### Phase 2: OpenAI Adapter Improvement
- [ ] Add `ProviderApiError` class to `base-adapter.ts`
- [ ] Add `RateLimitConfig`, `FetchUsageResult`, `FetchUsageOptions` to `base-adapter.ts`
- [ ] Add `supportsUsageApi()` to `ProviderAdapter` interface
- [ ] Rewrite `openai-adapter.ts` fetchUsage: remove mock, add pagination
- [ ] Add OpenAI error code handling (401, 429, 403)
- [ ] Set `rateLimitConfig` for OpenAI (1000ms delay)

### Phase 3: Anthropic & Google Adapters
- [ ] Rewrite `anthropic-adapter.ts` fetchUsage: Admin API call + 401/403 handling
- [ ] Remove `generateMockData()` from Anthropic adapter
- [ ] Rewrite `google-adapter.ts` fetchUsage: throw descriptive 501 error
- [ ] Remove `generateMockData()` from Google adapter
- [ ] Update `providers/index.ts` to re-export new types

### Phase 4: Sync Service Enhancement
- [ ] Add `upsertUsageRecord()` function (date+model+apiKeyId key)
- [ ] Add `withRetry()` utility (3 attempts, exponential backoff)
- [ ] Add `rateLimitDelay()` utility
- [ ] Add SyncHistory create/update logic
- [ ] Add pagination loop for OpenAI (hasMore handling)
- [ ] Handle `ProviderApiError` per-provider (partial success)
- [ ] Update `syncAllProviders()` to use new options

### Phase 5: Pricing Service
- [ ] Create `pricing.service.ts` with getModelPricing, calculateCost
- [ ] Add `seedDefaultPricing()` for initial data
- [ ] Add `FALLBACK_PRICING` constant for DB-miss scenarios
- [ ] Integrate pricing lookup into sync service (replace hardcoded prices)

### Phase 6: API Routes & UI
- [ ] Update `/api/sync/trigger/route.ts` with new interface
- [ ] Create `/api/sync/schedule/route.ts` with CRON_SECRET auth
- [ ] Create `/api/sync/history/route.ts` with pagination
- [ ] Create `SyncButton.tsx` component (idle/syncing/success/error states)
- [ ] Create `SyncHistory.tsx` component (list with status dots)
- [ ] Update `providers/[id]/page.tsx` to use SyncButton + SyncHistory
- [ ] Add SYNC_CONFIG, RATE_LIMITS to `constants.ts`
- [ ] Create `vercel.json` with cron configuration
- [ ] Full build verification (`npm run build`)

---

## 11. Error Handling Matrix

| Error | Source | Handling | User Impact |
|-------|--------|----------|-------------|
| 401 Invalid Key | OpenAI/Anthropic | Mark provider as needs-attention | "API key is invalid or expired" |
| 403 Not Admin Key | OpenAI/Anthropic | Log + skip provider | "Admin API key required for usage data" |
| 429 Rate Limited | Any provider | Wait + retry (exponential backoff) | Transparent (retry in background) |
| 500 Server Error | Any provider | Retry up to 3x, then fail | "Provider API temporarily unavailable" |
| 501 Not Supported | Google | Skip, return empty | "Usage API not supported. Use CSV import." |
| Network Error | Any | Retry up to 3x, then fail | "Network error. Check connection." |
| Timeout | Any | Fail after 30s | "Request timed out. Try syncing a shorter range." |

---

## 12. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | For Cron | Secret token for scheduled sync auth |
| `ENCRYPTION_KEY` | Yes (existing) | AES-256 key for API key decryption |
| `NEXT_PUBLIC_BKEND_PROJECT_URL` | Yes (existing) | bkend.ai project URL |
| `BKEND_API_KEY` | Yes (existing) | bkend.ai API key |

No new user-facing environment variables needed.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-15 | Initial design - real-data-sync | Solo Founder |
