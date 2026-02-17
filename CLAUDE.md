# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LLM Cost Manager** - SaaS platform for unified LLM API cost management and optimization across OpenAI, Anthropic, and Google AI providers. Includes a smart proxy that intercepts LLM API calls to provide caching, model routing, and cost tracking.

## Commands

All commands run from the `app/` directory:

```bash
cd "D:\Opencode\Business\app"
npm run dev      # Dev server (localhost:3000)
npm run build    # Production build (strict — treat as CI gate)
npm run lint     # ESLint
```

No test runner is configured yet (`vitest`/`playwright` in plan but not in package.json scripts).

## Environment Variables

Copy `.env.example` to `.env.local`. Required for local dev:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side RLS bypass (webhooks, cron) |
| `ENCRYPTION_KEY` | 32-byte hex (64 chars) for AES-256-GCM API key encryption |
| `STRIPE_SECRET_KEY` | Stripe server key (commission billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `STRIPE_METERED_PRICE_ID` | Metered billing price ID |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (proxy rate limiting, caching, budgets) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

## Architecture

### Monorepo Layout

The Next.js app lives in `app/` (not root). Root contains docs and tooling config. Path alias `@/*` maps to `app/src/*`.

### Two Data Paths

1. **Usage Sync** (polling): `usage-sync.service.ts` calls provider APIs on schedule, stores results in `usage_records` table via `bkend.ts`. Dashboard reads from these stored records.

2. **Smart Proxy** (real-time): Users route LLM calls through `/api/proxy/{openai,anthropic,google}/[...path]` (single-provider) or `/api/proxy/v2/[...path]` (multi-provider auto-detect). The proxy forwards requests, counts tokens, logs to `proxy_logs`, and applies optimizations (Redis caching, model routing, budget alerts).

3. **Centralized Pricing** (`pricing.service.ts`): Single source of truth for model costs. Uses in-memory cache with DB fallback. `computeCost(model, inputTokens, outputTokens)` is the only cost calculation function.

### Data Access Layer — `bkend.ts`

A Supabase wrapper that mimics a REST API. Translates path-based calls to Supabase queries:

- `bkend.get('/providers', { params: { orgId } })` → `supabase.from('providers').select('*').eq('org_id', orgId)`
- `bkend.post('/usage-records', body)` → `supabase.from('usage_records').insert(body)`
- Path segments: `/table-name` (list), `/table-name/id` (single), `/table-name/aggregate` (cost sum)
- Filter suffixes: `_gte`, `_lte`, `_sort`, `_limit`, `_offset`, `metadata.*`

Two exports: `bkend` (user-scoped, respects RLS) and `bkendService` (service role, bypasses RLS for webhooks/cron).

### Supabase Client Selection

Context-aware in `supabase.ts`:
- Browser → singleton browser client (session from cookies)
- Server + auth cookies present → server client (user-level RLS)
- Server + no auth cookies → service client (cron/webhook, bypasses RLS)

### Auth Flow

Supabase Auth with `@supabase/ssr`. Signup goes through `/api/auth/signup` (server-side user creation to bypass email confirmation), then client-side `signInWithPassword`. Session managed via Supabase cookies (`sb-*-auth-token`).

- `getMe()` — client-side, returns `AuthUser` (id/email/name only, no plan info)
- `getMeServer()` — server-side equivalent
- Full `User` type (with plan, stripe fields) requires `bkend.get<User>('/users/id')`

### Middleware

`src/middleware.ts` — Supabase SSR middleware that refreshes auth sessions and protects dashboard routes. Proxy API routes (`/api/proxy/*`) are excluded (they use proxy key auth).

### Provider Adapter Pattern

`src/services/providers/` — Strategy pattern for multi-provider support:
- `ProviderAdapter` interface in `base-adapter.ts`: `validateKey()`, `fetchUsage()`, `getAvailableModels()`
- Implementations: `OpenAIAdapter`, `AnthropicAdapter`, `GoogleAdapter`
- Factory: `createAdapter(type)` in `index.ts`

### Proxy Services

`src/services/proxy/` — Smart proxy pipeline with Redis-based distributed infrastructure:

**Core pipeline** (request flow order):
1. `proxy-key.service.ts` — Key resolution, hashing, encryption (supports `'auto'` provider type)
2. `rate-limiter.ts` — Redis sliding window rate limiting (async, with in-memory fallback)
3. `budget-check.service.ts` — Redis O(1) budget counter via `INCRBYFLOAT` (daily reconciliation cron)
4. `cache.service.ts` — Upstash Redis response cache (non-streaming only)
5. `model-router.service.ts` — Automatic model downgrade: auto (intent-based) or manual (rule-based)
6. `proxy-forward.service.ts` — Core forwarding, token counting, cost tracking, streaming passthrough
7. `token-counter.ts` — Token extraction from JSON and SSE streams (OpenAI, Anthropic, Google formats)

**Supporting services**:
- `redis.ts` — Shared Upstash Redis client singleton
- `budget-alert.service.ts` — Threshold alerts (80/90/100%) with Redis dedup
- `routing-quality.service.ts` — Routing quality scoring from user feedback
- `provider-detect.service.ts` — Auto-detect provider from request format (model name, body structure, path)

**Proxy routes**:
- `/api/proxy/{openai,anthropic,google}/[...path]` — Provider-specific endpoints (single-provider keys)
- `/api/proxy/v2/[...path]` — Unified endpoint (auto-detect provider, multi-provider keys)
- `/api/proxy/analytics/{timeseries,breakdown}` — Analytics aggregation APIs
- `/api/proxy/logs/[id]/feedback` — User feedback on routing decisions
- `/api/cron/reconcile-budgets` — Daily budget counter reconciliation

### Feature Modules

`src/features/{name}/` — Each feature has `components/` and `hooks/` subdirectories. Hooks are custom React hooks that call internal API routes (`/api/*`), not Supabase directly from the client.

### Billing

Commission-based model via Stripe: users pay 20% (`COMMISSION_RATE`) of savings achieved through the proxy. Uses Stripe metered billing with usage reporting via `/api/cron/report-usage`.

- Plans: `free` | `growth` (defined in `types/user.ts`)
- Limits enforced via `plan-limits.ts` (providers count, history days, request caps)
- Stripe SDK v20: `current_period_end` is on `SubscriptionItem`, not `Subscription`

### Route Groups

- `(auth)/` — Login, signup pages
- `(dashboard)/` — All authenticated pages (dashboard, providers, budget, alerts, projects, settings, proxy, reports)
- Public pages: landing (`/`), pricing, terms, privacy, billing success

## Key Patterns and Gotchas

- **`'use client'`** required for any component using hooks or browser APIs
- **`useSearchParams()`** must be wrapped in `<Suspense>` for Next.js static generation
- **Recharts Tooltip** `formatter` callback: cast with `(v) => Number(v)`, not typed parameter `(v: number)`
- **Badge** component uses `danger` variant, not `error`
- **Stripe client** uses lazy init (`getStripe()`) to avoid build-time errors from missing env vars
- **Encryption** format: `iv:tag:ciphertext` (all hex), using AES-256-GCM
- **Proxy logging** is fire-and-forget (errors swallowed) to avoid impacting request latency
- API keys are encrypted at rest; decrypted only server-side during sync or proxy forwarding
- **Proxy key prefix**: `lmc_` — keys are hashed (SHA-256) for storage, never stored in plaintext
- **bkend query params must be strings**: e.g. `isActive: 'true'` not `isActive: true`
- **Redis services use graceful fallback**: rate limiter falls back to in-memory Map, budget counter falls back to DB query

## Conventions

- Commit messages: English, conventional commits format
- Variables/functions: `camelCase`; Components: `PascalCase`; Files: `kebab-case`
- Communication: Korean; Code/docs: English
- UI framework: Tailwind CSS 4 with `clsx` + `tailwind-merge` for class composition
- Icons: `lucide-react`
- Forms: `react-hook-form` + `zod` validation
