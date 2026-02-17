# Smart Proxy v2 - PDCA Plan

> Feature: smart-proxy-v2
> Phase: Plan
> Created: 2026-02-17
> Status: Draft

## 1. Background & Problem Statement

### Current State (Proxy v1)

The LLM Cost Manager proxy is live with these capabilities:
- **Request forwarding**: OpenAI, Anthropic, Google via `/api/proxy/{provider}/[...path]`
- **Auth**: Proxy keys (`lmc_` prefix), per-key provider binding
- **Caching**: Upstash Redis + in-memory fallback, SHA-256 key hashing, configurable TTL
- **Model routing**: Hybrid intent classification (keyword patterns + LLM fallback via gpt-4o-mini), 11 intent categories, token-threshold routing
- **Rate limiting**: In-memory sliding window, per-key per-minute
- **Budget enforcement**: Monthly per-key spend tracking, fail-open on error
- **Logging**: Fire-and-forget to `proxy_logs` table, savings tracking
- **UI**: 3-tab page (Keys / Savings / Logs), savings dashboard with recommendations

### Problems to Solve

| # | Problem | Impact | Priority |
|---|---------|--------|----------|
| P1 | **No real-time analytics** - Savings dashboard is a flat summary with no time-series charts, no per-model breakdown | Users can't see cost trends or identify which models/keys cost most | High |
| P2 | **No usage alerting** - Budget check blocks at threshold but no proactive warning | Users discover budget exceeded after request fails | High |
| P3 | **Rate limiter is in-memory** - Resets on server restart, doesn't work across Vercel serverless instances | Rate limits are unreliable in production | High |
| P4 | **Budget check queries all logs per request** - `SELECT * FROM proxy_logs WHERE ...` on every request | O(n) per request, degrades with usage | Medium |
| P5 | **No routing quality feedback** - Model routing has no way to know if cheaper model actually worked | Can't improve routing accuracy over time | Medium |
| P6 | **Single-provider keys** - Each proxy key is bound to one provider, users need separate keys per provider | Complex setup for multi-provider users | Medium |
| P7 | **No request/response visibility** - Logs only store metadata, not payloads | Hard to debug failed or slow requests | Low |
| P8 | **Pricing is hardcoded** - Model prices duplicated in `proxy-forward.service.ts` and `model-router.service.ts` | Price updates require code changes in multiple files | Medium |

## 2. Goals & Success Metrics

### Goals

1. **Analytics**: Time-series cost visualization, per-model/per-key breakdown, exportable reports
2. **Reliability**: Distributed rate limiting and budget tracking that works across serverless
3. **Performance**: O(1) budget checks via pre-aggregated counters
4. **Intelligence**: Routing quality feedback loop and user-configurable routing rules
5. **Usability**: Multi-provider keys, proactive budget alerts, better onboarding

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Budget check latency (p95) | ~200ms (full query) | < 5ms | Pre-aggregated counter |
| Rate limit accuracy | ~60% (in-memory) | 100% | Redis-based sliding window |
| Routing quality score | Unknown | Tracked per model pair | Feedback signals |
| User cost savings visibility | Summary only | Time-series + breakdown | Analytics dashboard |
| Alert coverage | 0% (post-hoc only) | 80%/90%/100% thresholds | Budget alert notifications |

## 3. Scope

### In Scope (v2.0)

| # | Feature | Description | Depends On |
|---|---------|-------------|------------|
| F1 | **Analytics Dashboard** | Time-series charts (daily cost, savings), per-model breakdown, per-key breakdown, period comparison | Recharts |
| F2 | **Distributed Rate Limiter** | Replace in-memory Map with Upstash Redis sliding window counter | Upstash Redis (already used for cache) |
| F3 | **Pre-aggregated Budget Counter** | Maintain running spend counter in Redis, update on each request, read in O(1) | F2 (Redis dependency) |
| F4 | **Budget Alert System** | Configurable thresholds (80%, 90%, 100%), in-app notifications, optional email | Alert feature (existing) |
| F5 | **Centralized Pricing Service** | Single source of truth for model pricing, DB-backed with fallback constants | pricing.service.ts |
| F6 | **Routing Rules UI** | User-configurable routing rules per key (e.g., "always route gpt-4o to gpt-4o-mini for this key") | ProxyKey model extension |
| F7 | **Routing Quality Tracking** | Log routing decisions, allow user thumbs-up/down on responses, aggregate quality score | proxy_logs extension |
| F8 | **Multi-provider Keys** | Optional: single proxy key can auto-detect provider from request format | New key type |

### Out of Scope (Future)

- Request/response payload storage (privacy/storage concerns — defer to v3)
- Provider API key rotation (complex key management — defer)
- Webhook integrations (Slack/Discord notifications — defer)
- A/B testing framework for routing (needs quality tracking data first — v3)
- Custom model fine-tune integration

## 4. Technical Approach

### F1: Analytics Dashboard

**Data source**: Existing `proxy_logs` table, aggregated via new API endpoints.

New API routes:
- `GET /api/proxy/analytics/timeseries` — daily cost/savings/requests over period
- `GET /api/proxy/analytics/breakdown` — cost by model, by provider, by key

New components:
- `ProxyCostTrendChart` — Recharts AreaChart (daily cost vs savings)
- `ModelBreakdownChart` — Recharts BarChart (cost per model)
- `KeyBreakdownTable` — per-key spend summary with sparklines

Aggregation strategy: Server-side aggregation in API routes using Supabase `.select()` with date grouping. For MVP, aggregate in application code (Supabase doesn't expose `GROUP BY` via PostgREST easily). Consider Supabase RPC function if performance is insufficient.

### F2: Distributed Rate Limiter

Replace `rate-limiter.ts` in-memory Map with Redis sliding window:

```
Key: lcm:ratelimit:{proxyKeyId}:{minuteBucket}
Value: request count
TTL: 120s (2 minutes to cover window boundary)
```

Use existing Upstash Redis client from `cache.service.ts`. Add shared `getRedis()` to a common module. Keep in-memory fallback for local dev without Redis.

### F3: Pre-aggregated Budget Counter

Instead of querying all `proxy_logs` per request:

```
Key: lcm:budget:{proxyKeyId}:{YYYY-MM}
Value: cumulative spend (float)
TTL: 45 days
```

On each request completion: `INCRBYFLOAT` the budget counter by request cost.
Budget check: single `GET` → compare with limit.
Monthly reset: Natural via key pattern (new month = new key, old key expires).

Reconciliation: Daily cron job recalculates from `proxy_logs` to correct drift.

### F4: Budget Alert System

Extend `ProxyKey` type with alert thresholds:
```typescript
budgetAlertThresholds: number[] // e.g., [0.8, 0.9, 1.0]
budgetAlertsEnabled: boolean
```

On budget counter update, check thresholds. If crossed, insert into existing `alerts` table with type `budget_threshold`. In-app notification via existing alert system. Email via existing SMTP config (if configured).

Track "already alerted" state in Redis to avoid duplicate alerts:
```
Key: lcm:budget-alert:{proxyKeyId}:{YYYY-MM}:{threshold}
Value: 1
TTL: 45 days
```

### F5: Centralized Pricing Service

Refactor `pricing.service.ts` to be the single source:
1. Store model prices in `model_pricing` DB table (already defined in schema)
2. Cache in-memory with 1-hour TTL
3. Fallback to hardcoded constants if DB unavailable
4. Remove duplicate `PRICING` objects from `proxy-forward.service.ts` and `model-router.service.ts`

### F6: Routing Rules UI

Extend `ProxyKey` with routing configuration:
```typescript
routingRules: {
  mode: 'auto' | 'manual' | 'off'
  manualRules: Array<{
    fromModel: string
    toModel: string
    condition: 'always' | 'simple-only' | 'short-only'
  }>
  qualityThreshold: number // 0-1, below this routing is disabled
}
```

UI: Form in proxy key settings to configure rules per key.

### F7: Routing Quality Tracking

Extend `proxy_logs`:
- `routingDecision`: JSON (intent, confidence, reason)
- `userFeedback`: 'positive' | 'negative' | null

New API: `POST /api/proxy/logs/:id/feedback` — user rates a routed response.

Aggregate: Weekly quality score per model pair. If quality drops below threshold, disable routing for that pair.

### F8: Multi-provider Keys

New key type: `providerType = 'auto'`. Route based on request format detection:
- `messages` array + `model` starting with `gpt-` or `o1`/`o3` → OpenAI
- `messages` array + `model` starting with `claude-` → Anthropic
- `contents` array → Google

Requires new unified endpoint: `/api/proxy/v2/[...path]`

## 5. Implementation Order

```
Phase 1 (Foundation):
  F5 → F2 → F3
  (Centralized pricing → Redis rate limiter → Redis budget counter)

Phase 2 (Analytics):
  F1 → F4
  (Analytics dashboard → Budget alerts)

Phase 3 (Intelligence):
  F7 → F6
  (Quality tracking → Routing rules UI)

Phase 4 (Multi-provider):
  F8
  (Multi-provider keys — can be deferred if time-constrained)
```

## 6. Data Model Changes

### New Columns on `proxy_keys`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `budget_alert_thresholds` | jsonb | `[0.8, 0.9, 1.0]` | Alert trigger thresholds |
| `budget_alerts_enabled` | boolean | `false` | Enable budget alerts |
| `routing_rules` | jsonb | `null` | Custom routing rules |

### New Columns on `proxy_logs`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `routing_decision` | jsonb | `null` | Intent category, confidence, reason |
| `user_feedback` | text | `null` | `positive` / `negative` |

### Redis Key Schema

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `lcm:ratelimit:{keyId}:{minute}` | Rate limit counter | 120s |
| `lcm:budget:{keyId}:{YYYY-MM}` | Monthly spend counter | 45d |
| `lcm:budget-alert:{keyId}:{YYYY-MM}:{pct}` | Alert dedup flag | 45d |
| `lcm:pricing:cache` | Model pricing cache | 1h |
| `lcm:cache:{hash}` | Response cache (existing) | configurable |

## 7. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Redis downtime breaks rate limiting + budget | Low | High | In-memory fallback (existing pattern), fail-open |
| Budget counter drift from Redis failures | Medium | Medium | Daily reconciliation cron from proxy_logs |
| Model routing quality degradation | Medium | Medium | Quality tracking + automatic disable below threshold |
| Analytics queries slow with large log volume | Medium | Low | Pagination + date-range limits, future: materialized views |
| Multi-provider key format detection errors | Low | Medium | Strict pattern matching, fallback to error with helpful message |

## 8. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Upstash Redis | Active | Already used for cache, extend for rate limit + budget |
| Supabase | Active | DB for proxy_logs, proxy_keys |
| Recharts | Active | Already used in dashboard, extend for proxy analytics |
| Alerts feature | Active | Existing alert system in `src/features/alerts/` |
| Pricing service | Active | Existing `pricing.service.ts`, needs refactor |

## 9. Estimated Effort

| Phase | Features | Complexity | Files Changed |
|-------|----------|------------|---------------|
| Phase 1 | F5, F2, F3 | Medium | ~8 files |
| Phase 2 | F1, F4 | Medium-High | ~12 files (new components + API routes) |
| Phase 3 | F7, F6 | Medium | ~8 files |
| Phase 4 | F8 | Medium | ~5 files (new route + detection logic) |

## 10. Open Questions

1. Should multi-provider keys (F8) be deferred to v3 to reduce scope?
2. Should routing quality tracking (F7) include automatic A/B testing, or just passive tracking for v2?
3. What's the maximum acceptable latency overhead for the Redis rate limiter per request? (Target: < 3ms)
