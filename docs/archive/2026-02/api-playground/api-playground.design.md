# Design: API Playground

> Plan Reference: `docs/01-plan/features/api-playground.plan.md`

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Playground Page                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ ModelSelector │  │ ParamControls│  │ ComparisonToggle  │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘ │
│         │                 │                    │            │
│  ┌──────▼─────────────────▼────────────────────▼──────────┐ │
│  │              PlaygroundEditor                          │ │
│  │  ┌─────────────────┐  ┌────────────────────────────┐   │ │
│  │  │  System Prompt   │  │  User Message              │   │ │
│  │  └─────────────────┘  └────────────────────────────┘   │ │
│  │  [Token Estimate: ~150 tokens | ~$0.0004]  [Execute]   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              ResponsePanel (or ComparisonView)         │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │  AI Response (markdown rendered)                │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │  Input: 150 | Output: 320 | Cost: $0.0012 | 1,240ms   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              ExecutionHistory                          │ │
│  │  [gpt-4o | 470 tokens | $0.0012 | 2s ago]             │ │
│  │  [claude-sonnet-4-5 | 380 tokens | $0.0009 | 5m ago]  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

API Flow:
  Client → POST /api/playground/execute → Server decrypts key → Provider API → Response + metrics
  Client → POST /api/playground/estimate → Server-side token estimation → cost preview
  Client → GET  /api/playground/history  → bkend DB query → paginated results
```

## 2. Type Definitions

### `src/types/playground.ts`

```typescript
import type { ProviderType } from '@/types'

// === Execute Request/Response ===

export interface PlaygroundExecuteRequest {
  providerId: string       // FK → providers table
  model: string            // e.g. 'gpt-4o', 'claude-sonnet-4-5'
  systemPrompt?: string
  userPrompt: string
  temperature: number      // 0.0 ~ 2.0
  maxTokens: number        // 1 ~ 4096
}

export interface PlaygroundExecuteResponse {
  response: string
  inputTokens: number
  outputTokens: number
  cost: number             // USD
  responseTimeMs: number
  model: string
  provider: ProviderType
}

// === Estimate Request/Response ===

export interface PlaygroundEstimateRequest {
  provider: ProviderType
  model: string
  systemPrompt?: string
  userPrompt: string
}

export interface PlaygroundEstimateResponse {
  estimatedInputTokens: number
  estimatedCost: number    // USD (input only, output unknown)
  modelPricing: {
    input: number          // per 1M tokens
    output: number         // per 1M tokens
  }
}

// === History ===

export interface PlaygroundHistory {
  id: string
  orgId: string
  userId: string
  provider: ProviderType
  model: string
  systemPrompt?: string
  userPrompt: string
  response: string
  inputTokens: number
  outputTokens: number
  cost: number
  responseTimeMs: number
  temperature: number
  maxTokens: number
  createdAt: string
}

// === Model Info ===

export interface ModelInfo {
  id: string               // e.g. 'gpt-4o'
  provider: ProviderType
  label: string            // e.g. 'GPT-4o'
  inputPrice: number       // per 1M tokens
  outputPrice: number      // per 1M tokens
}

// === Comparison Mode ===

export interface ComparisonResult {
  left: PlaygroundExecuteResponse | null
  right: PlaygroundExecuteResponse | null
  leftModel: string
  rightModel: string
  leftLoading: boolean
  rightLoading: boolean
}

// === UI State ===

export type PlaygroundMode = 'single' | 'compare'
```

## 3. Provider Adapter Extension

### `src/services/providers/base-adapter.ts` — Add `executePrompt()` to interface

```typescript
// ADD to existing ProviderAdapter interface:

export interface PromptRequest {
  model: string
  systemPrompt?: string
  userPrompt: string
  temperature: number
  maxTokens: number
}

export interface PromptResponse {
  content: string
  inputTokens: number
  outputTokens: number
  model: string
}

export interface ProviderAdapter {
  // ... existing methods ...
  executePrompt(apiKey: string, request: PromptRequest): Promise<PromptResponse>
}
```

### `src/services/providers/openai-adapter.ts` — `executePrompt()` implementation

```typescript
async executePrompt(apiKey: string, request: PromptRequest): Promise<PromptResponse> {
  const messages: Array<{ role: string; content: string }> = []
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt })
  }
  messages.push({ role: 'user', content: request.userPrompt })

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: request.model,
      messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ProviderApiError(
      res.status,
      (err as { error?: { message?: string } }).error?.message || `OpenAI error: ${res.statusText}`,
      'openai',
    )
  }

  const data = await res.json() as OpenAIChatResponse
  return {
    content: data.choices?.[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    model: data.model || request.model,
  }
}

// ADD interface:
interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  model?: string
}
```

### `src/services/providers/anthropic-adapter.ts` — `executePrompt()` implementation

```typescript
async executePrompt(apiKey: string, request: PromptRequest): Promise<PromptResponse> {
  const body: Record<string, unknown> = {
    model: request.model,
    max_tokens: request.maxTokens,
    temperature: request.temperature,
    messages: [{ role: 'user', content: request.userPrompt }],
  }
  if (request.systemPrompt) {
    body.system = request.systemPrompt
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ProviderApiError(
      res.status,
      (err as { error?: { message?: string } }).error?.message || `Anthropic error: ${res.statusText}`,
      'anthropic',
    )
  }

  const data = await res.json() as AnthropicMessageResponse
  const content = data.content?.map(b => b.text).join('') || ''
  return {
    content,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
    model: data.model || request.model,
  }
}

// ADD interface:
interface AnthropicMessageResponse {
  content?: Array<{ type: string; text: string }>
  usage?: { input_tokens?: number; output_tokens?: number }
  model?: string
}
```

### `src/services/providers/google-adapter.ts` — `executePrompt()` implementation

```typescript
async executePrompt(apiKey: string, request: PromptRequest): Promise<PromptResponse> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []
  if (request.systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: request.systemPrompt }] })
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] })
  }
  contents.push({ role: 'user', parts: [{ text: request.userPrompt }] })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ProviderApiError(
      res.status,
      (err as { error?: { message?: string } }).error?.message || `Google AI error: ${res.statusText}`,
      'google',
    )
  }

  const data = await res.json() as GoogleGenerateResponse
  const content = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
  return {
    content,
    inputTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    model: request.model,
  }
}

// ADD interface:
interface GoogleGenerateResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}
```

## 4. API Routes

### 4.1 `POST /api/playground/execute`

**Path**: `src/app/api/playground/execute/route.ts`

```typescript
// Flow:
// 1. Auth check (getMeServer)
// 2. Validate request body
// 3. Check playground execution limit (plan-based)
// 4. Load provider + API key from DB
// 5. Decrypt API key (server-side only)
// 6. Create adapter, call executePrompt()
// 7. Calculate cost using adapter pricing
// 8. Save to playground_history (bkend)
// 9. Return response + metrics

// Request: PlaygroundExecuteRequest
// Response: PlaygroundExecuteResponse

// Error cases:
// 401 - Unauthorized
// 400 - Missing required fields
// 403 - Playground limit reached (free plan)
// 404 - Provider or API key not found
// 408 - Timeout (60s)
// 429 - Provider rate limit
// 500 - Execution error
```

**Key implementation details**:
- `performance.now()` for accurate response time measurement
- `AbortSignal.timeout(60_000)` on provider API calls
- Cost calculation: `(inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000`
- Pricing data from adapter model constants (OPENAI_MODELS, ANTHROPIC_MODELS, GOOGLE_MODELS)
- Save history entry to bkend `playground_history` table after successful execution

### 4.2 `POST /api/playground/estimate`

**Path**: `src/app/api/playground/estimate/route.ts`

```typescript
// Flow:
// 1. Auth check
// 2. Estimate input tokens (rough: chars / 4)
// 3. Look up model pricing from adapter
// 4. Calculate estimated input cost

// Request: PlaygroundEstimateRequest
// Response: PlaygroundEstimateResponse

// Token estimation heuristic:
//   English: ~4 chars per token
//   Korean/CJK: ~2 chars per token
//   Mixed: detect ratio, weighted average
```

**Token estimation logic**:
```typescript
function estimateTokens(text: string): number {
  const cjkPattern = /[\u3000-\u9fff\uac00-\ud7af]/g
  const cjkCount = (text.match(cjkPattern) || []).length
  const nonCjkCount = text.length - cjkCount
  return Math.ceil(cjkCount / 2 + nonCjkCount / 4)
}
```

### 4.3 `GET /api/playground/history`

**Path**: `src/app/api/playground/history/route.ts`

```typescript
// Flow:
// 1. Auth check
// 2. Get orgId from user
// 3. Query bkend playground_history with pagination
// 4. Return sorted by createdAt DESC

// Query params: limit (default 20, max 50), offset (default 0)
// Response: { data: PlaygroundHistory[], total: number }
```

## 5. Plan Limits Integration

### `src/lib/constants.ts` — Update PLAN_LIMITS

```typescript
export const PLAN_LIMITS = {
  free: { providers: 1, historyDays: 7, members: 1, maxRequests: 1000, playgroundDaily: 10 },
  growth: { providers: -1, historyDays: 365, members: -1, maxRequests: -1, playgroundDaily: -1 },
} as const
```

### `src/lib/plan-limits.ts` — Add `checkPlaygroundLimit()`

```typescript
export function checkPlaygroundLimit(plan: UserPlan, todayCount: number): PlanLimitCheck {
  const limit = PLAN_LIMITS[plan].playgroundDaily as number
  if (isUnlimited(limit)) return { allowed: true, current: todayCount, limit: -1 }
  const allowed = todayCount < limit
  return {
    allowed,
    current: todayCount,
    limit,
    planRequired: allowed ? undefined : 'growth',
  }
}
```

## 6. UI Components

### 6.1 `PlaygroundEditor.tsx`

**Path**: `src/features/playground/components/PlaygroundEditor.tsx`

- **System prompt**: Optional collapsible `<textarea>` (3 rows default)
- **User message**: Required `<textarea>` (6 rows default, auto-expand)
- **Token estimate bar**: Shows estimated tokens + cost on input change (debounced 500ms)
- **Execute button**: Primary button, disabled during loading, shows spinner
- **Keyboard shortcut**: Ctrl+Enter / Cmd+Enter to execute
- **Props**: `onExecute(req)`, `loading`, `estimate`, `disabled`

### 6.2 `ResponsePanel.tsx`

**Path**: `src/features/playground/components/ResponsePanel.tsx`

- **Response area**: Markdown-rendered AI response (use `dangerouslySetInnerHTML` with sanitization or simple `<pre>` with whitespace)
- **Metrics bar**: 4 pills — Input tokens | Output tokens | Cost ($) | Response time (ms)
- **Empty state**: "프롬프트를 실행하면 응답이 여기에 표시됩니다"
- **Error state**: Red bordered box with error message
- **Copy button**: Copy response to clipboard
- **Props**: `result: PlaygroundExecuteResponse | null`, `error: string | null`, `loading: boolean`

### 6.3 `ModelSelector.tsx`

**Path**: `src/features/playground/components/ModelSelector.tsx`

- **Provider dropdown**: Shows active providers from user's registered list
- **Model dropdown**: Filtered by selected provider, shows model name + price
- **Price display**: "Input: $X / 1M | Output: $Y / 1M" below model selector
- **Data source**: Fetch active providers via `useProviders()`, models from adapter `getAvailableModels()`
- **Props**: `selectedProvider`, `selectedModel`, `onProviderChange`, `onModelChange`, `providers`

### 6.4 `ParameterControls.tsx`

**Path**: `src/features/playground/components/ParameterControls.tsx`

- **Temperature**: Range slider 0.0 ~ 2.0 (step 0.1), numeric display
- **Max Tokens**: Number input 1 ~ 4096 (default 1024)
- **Layout**: Horizontal on desktop, stacked on mobile
- **Props**: `temperature`, `maxTokens`, `onTemperatureChange`, `onMaxTokensChange`

### 6.5 `ExecutionHistory.tsx`

**Path**: `src/features/playground/components/ExecutionHistory.tsx`

- **List**: Compact rows showing provider icon, model, prompt preview (truncated 60 chars), tokens, cost, relative time
- **Click action**: Populate editor with the prompt and show the response
- **Pagination**: "더 보기" button at bottom (load 20 more)
- **Empty state**: "실행 기록이 없습니다"
- **Props**: `history: PlaygroundHistory[]`, `onSelect(item)`, `onLoadMore`, `hasMore`, `loading`

### 6.6 `ComparisonView.tsx`

**Path**: `src/features/playground/components/ComparisonView.tsx`

- **Layout**: Two-column side-by-side (left/right model)
- **Each side**: Model name badge + response + metrics
- **Comparison table**: Bottom row comparing tokens, cost, response time with delta (%)
- **Winner highlight**: Green border on cheaper/faster model
- **Props**: `comparison: ComparisonResult`

## 7. Custom Hook

### `usePlayground.ts`

**Path**: `src/features/playground/hooks/usePlayground.ts`

```typescript
interface UsePlaygroundReturn {
  // State
  mode: PlaygroundMode              // 'single' | 'compare'
  provider: string                  // selected providerId
  model: string                     // selected model
  compareModel: string              // second model for comparison
  systemPrompt: string
  userPrompt: string
  temperature: number
  maxTokens: number
  result: PlaygroundExecuteResponse | null
  comparison: ComparisonResult | null
  error: string | null
  loading: boolean
  estimate: PlaygroundEstimateResponse | null

  // History
  history: PlaygroundHistory[]
  historyLoading: boolean
  hasMoreHistory: boolean

  // Limit
  todayCount: number
  dailyLimit: number               // -1 = unlimited
  limitReached: boolean

  // Actions
  setMode: (mode: PlaygroundMode) => void
  setProvider: (id: string) => void
  setModel: (model: string) => void
  setCompareModel: (model: string) => void
  setSystemPrompt: (s: string) => void
  setUserPrompt: (s: string) => void
  setTemperature: (t: number) => void
  setMaxTokens: (n: number) => void
  execute: () => Promise<void>
  loadMoreHistory: () => void
  selectHistory: (item: PlaygroundHistory) => void
  refreshEstimate: () => void
}
```

**Implementation details**:
- `execute()`: Calls `/api/playground/execute`, updates result state, increments todayCount
- In compare mode, `execute()` fires 2 parallel requests (Promise.all)
- `refreshEstimate()`: Debounced 500ms call to `/api/playground/estimate`
- History loads on mount via `/api/playground/history`
- `todayCount`: Fetched from history where `createdAt` is today
- Provider/model defaults: First active provider + first model from adapter

## 8. Page Component

### `src/app/(dashboard)/playground/page.tsx`

```typescript
'use client'

// Layout:
// 1. Page header: "API Playground" + mode toggle (Single / Compare)
// 2. Top bar: ModelSelector + ParameterControls
//    - Compare mode: two ModelSelectors side by side
// 3. PlaygroundEditor: system prompt + user message + execute
// 4. ResponsePanel (single) or ComparisonView (compare)
// 5. ExecutionHistory: collapsible section at bottom

// Loading state: skeleton cards
// Auth: useSession() guard
// Plan limit: show warning banner when limitReached
```

## 9. Navigation Update

### `src/lib/constants.ts` — Add to NAV_ITEMS

```typescript
// Add after '프록시' entry:
{ label: '플레이그라운드', href: '/playground', icon: 'Terminal' },
```

### `src/components/layout/NavBar.tsx` — Add icon import

```typescript
// Add Terminal to lucide-react imports
import { ..., Terminal, ... } from 'lucide-react'

// Add to iconMap
const iconMap: Record<string, React.ElementType> = {
  ...,
  Terminal,
}
```

## 10. Data Model (bkend)

### Table: `playground_history`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, auto |
| orgId | string | FK → organizations, required |
| userId | string | FK → users, required |
| provider | string | required (openai, anthropic, google) |
| model | string | required |
| systemPrompt | text | nullable |
| userPrompt | text | required |
| response | text | required |
| inputTokens | integer | required, default 0 |
| outputTokens | integer | required, default 0 |
| cost | float | required, default 0 |
| responseTimeMs | integer | required, default 0 |
| temperature | float | required, default 1.0 |
| maxTokens | integer | required, default 1024 |
| createdAt | datetime | auto |

**Indexes**: `orgId` (for history query), `userId + createdAt` (for daily count)

## 11. Security Considerations

| Concern | Mitigation |
|---------|------------|
| API key exposure to client | Keys decrypted server-side only in execute route |
| Prompt injection via system prompt | No server-side prompt injection risk (user's own keys) |
| Excessive API calls (cost) | Free: 10/day, Growth: server-side 10/min throttle |
| Large response size | maxTokens capped at 4096, response truncated at 32KB |
| XSS via AI response | Response displayed as plain text or sanitized markdown |
| History data leakage | orgId filter on all history queries, auth check |

## 12. Error Handling

| Error | HTTP | User Message |
|-------|------|-------------|
| Not authenticated | 401 | "로그인이 필요합니다" |
| Missing required fields | 400 | "프롬프트를 입력해주세요" |
| Provider not found | 404 | "프로바이더를 찾을 수 없습니다" |
| API key not found | 404 | "API 키가 등록되지 않았습니다. 프로바이더 설정에서 키를 추가하세요." |
| Daily limit reached | 403 | "오늘의 실행 한도(10회)에 도달했습니다. Growth 플랜으로 업그레이드하세요." |
| Provider rate limit | 429 | "프로바이더 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요." |
| Timeout (60s) | 408 | "응답 시간이 초과되었습니다. 더 짧은 프롬프트나 작은 모델을 시도하세요." |
| Provider API error | 502 | "프로바이더 API 오류: {message}" |

## 13. Implementation Order

| Phase | Scope | Files | Dependencies |
|-------|-------|-------|-------------|
| **Phase 1**: Data Layer | Types + adapter `executePrompt()` | `types/playground.ts`, 3 adapter files, `base-adapter.ts` | None |
| **Phase 2**: API Routes | Execute, estimate, history | 3 route files, `plan-limits.ts`, `constants.ts` | Phase 1 |
| **Phase 3**: Core UI | Editor, response, model selector, params | 4 component files | Phase 2 |
| **Phase 4**: History & Compare | History list, comparison view, hook | `ExecutionHistory.tsx`, `ComparisonView.tsx`, `usePlayground.ts` | Phase 3 |
| **Phase 5**: Page & Nav | Page component, navigation update | `playground/page.tsx`, `NavBar.tsx`, `constants.ts` | Phase 4 |

## 14. File Summary

### New Files (12)

| # | File | LOC (est) |
|---|------|-----------|
| 1 | `src/types/playground.ts` | ~80 |
| 2 | `src/app/api/playground/execute/route.ts` | ~120 |
| 3 | `src/app/api/playground/estimate/route.ts` | ~60 |
| 4 | `src/app/api/playground/history/route.ts` | ~50 |
| 5 | `src/features/playground/components/PlaygroundEditor.tsx` | ~130 |
| 6 | `src/features/playground/components/ResponsePanel.tsx` | ~100 |
| 7 | `src/features/playground/components/ModelSelector.tsx` | ~90 |
| 8 | `src/features/playground/components/ParameterControls.tsx` | ~70 |
| 9 | `src/features/playground/components/ExecutionHistory.tsx` | ~100 |
| 10 | `src/features/playground/components/ComparisonView.tsx` | ~120 |
| 11 | `src/features/playground/hooks/usePlayground.ts` | ~180 |
| 12 | `src/app/(dashboard)/playground/page.tsx` | ~100 |

### Modified Files (7)

| # | File | Change |
|---|------|--------|
| 1 | `src/services/providers/base-adapter.ts` | Add `PromptRequest`, `PromptResponse`, `executePrompt()` to interface |
| 2 | `src/services/providers/openai-adapter.ts` | Implement `executePrompt()` + `OpenAIChatResponse` type |
| 3 | `src/services/providers/anthropic-adapter.ts` | Implement `executePrompt()` + `AnthropicMessageResponse` type |
| 4 | `src/services/providers/google-adapter.ts` | Implement `executePrompt()` + `GoogleGenerateResponse` type |
| 5 | `src/lib/constants.ts` | Add `playgroundDaily` to PLAN_LIMITS, `Terminal` to NAV_ITEMS |
| 6 | `src/lib/plan-limits.ts` | Add `checkPlaygroundLimit()` function |
| 7 | `src/components/layout/NavBar.tsx` | Add `Terminal` icon import to iconMap |

**Total**: 19 files, ~1,200 LOC estimated

## 15. Environment Variables

No new environment variables required. Uses existing:
- `ENCRYPTION_KEY` — for API key decryption
- bkend connection — for history persistence
