# Billing & Payments (billing-payments) Design Document

> **Feature**: Billing & Payments - Stripe 결제 연동 & 구독 관리
>
> **Project**: LLM Cost Manager
> **Author**: Solo Founder
> **Date**: 2026-02-15
> **Status**: Draft
> **Level**: Dynamic
> **Plan Reference**: `docs/01-plan/features/billing-payments.plan.md`

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│ Client (Next.js App Router)                                      │
│                                                                  │
│  Pricing Page ──→ useBilling() ──→ POST /api/billing/checkout    │
│  Settings Page ──→ useBilling() ──→ POST /api/billing/portal     │
│  Settings Page ──→ useBilling() ──→ GET  /api/billing/status     │
│  Dashboard ──→ TrialBanner component                             │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ Server (API Routes)                                              │
│                                                                  │
│  /api/billing/checkout  ──→ stripe.checkout.sessions.create()    │
│  /api/billing/portal    ──→ stripe.billingPortal.sessions.create │
│  /api/billing/status    ──→ stripe.subscriptions.retrieve()      │
│  /api/billing/webhook   ←── Stripe Webhook Events                │
│                                                                  │
│  Plan Enforcement:                                               │
│  checkPlanLimit() utility ──→ PLAN_LIMITS validation             │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ External Services                                                │
│                                                                  │
│  Stripe ←──→ Checkout, Portal, Subscriptions, Invoices          │
│  bkend.ai ←──→ User (plan, stripeCustomerId), payment_history   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Type Definitions

### 2.1 `types/billing.ts` (NEW)

```typescript
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'

export interface SubscriptionInfo {
  plan: UserPlan
  status: SubscriptionStatus
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
  stripeCustomerId?: string
  subscriptionId?: string
}

export interface PaymentHistory {
  id: string
  orgId: string
  stripeInvoiceId: string
  amount: number
  currency: string
  status: 'paid' | 'failed' | 'pending'
  description: string
  paidAt?: string
  invoiceUrl?: string
  createdAt: string
}

export interface CheckoutRequest {
  priceId: string
  successUrl: string
  cancelUrl: string
}

export interface CheckoutResponse {
  url: string
}

export interface PortalResponse {
  url: string
}

export interface BillingStatus {
  subscription: SubscriptionInfo
  invoices: PaymentHistory[]
}

export interface PlanLimitCheck {
  allowed: boolean
  current: number
  limit: number
  planRequired?: UserPlan
}
```

### 2.2 `types/user.ts` (MODIFY)

```typescript
export type UserPlan = 'free' | 'starter' | 'pro' | 'enterprise'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  plan: UserPlan
  // NEW: Stripe subscription fields
  stripeCustomerId?: string
  subscriptionId?: string
  subscriptionStatus?: SubscriptionStatus
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  trialEnd?: string
  createdAt: string
  updatedAt: string
}
```

### 2.3 `types/index.ts` (MODIFY)

Add new exports:

```typescript
export type {
  SubscriptionStatus,
  SubscriptionInfo,
  PaymentHistory,
  CheckoutRequest,
  CheckoutResponse,
  PortalResponse,
  BillingStatus,
  PlanLimitCheck,
} from './billing'
```

---

## 3. Component Specifications

### 3.1 `lib/stripe.ts` (NEW)

Stripe client initialization and utility functions.

```typescript
import Stripe from 'stripe'

// Server-side Stripe client (API Routes only)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
})

// Price ID mapping from environment variables
export const STRIPE_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
} as const

// Map Stripe Price ID to UserPlan
export function priceIdToPlan(priceId: string): UserPlan {
  if (priceId === STRIPE_PRICES.starter) return 'starter'
  if (priceId === STRIPE_PRICES.pro) return 'pro'
  if (priceId === STRIPE_PRICES.enterprise) return 'enterprise'
  return 'free'
}

// Map UserPlan to Stripe Price ID (null for free)
export function planToPriceId(plan: UserPlan): string | null {
  if (plan === 'free') return null
  return STRIPE_PRICES[plan] ?? null
}
```

**Dependencies**: `stripe` (npm package, server-side only)

### 3.2 `lib/stripe-client.ts` (NEW)

Client-side Stripe loader for checkout redirect.

```typescript
import { loadStripe } from '@stripe/stripe-js'

let stripePromise: ReturnType<typeof loadStripe> | null = null

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}
```

**Dependencies**: `@stripe/stripe-js` (npm package, client-side)

### 3.3 `lib/plan-limits.ts` (NEW)

Plan enforcement utility for API routes.

```typescript
import { PLAN_LIMITS } from './constants'
import type { UserPlan, PlanLimitCheck } from '@/types'

// Check if action is within plan limits
export function checkProviderLimit(plan: UserPlan, currentCount: number): PlanLimitCheck
export function checkHistoryLimit(plan: UserPlan): { maxDays: number }
export function checkMemberLimit(plan: UserPlan, currentCount: number): PlanLimitCheck

// Check if a feature is available on the given plan
export function isFeatureAvailable(plan: UserPlan, feature: 'optimization' | 'analytics' | 'export' | 'team'): boolean

// Get the minimum plan required for a feature
export function getRequiredPlan(feature: string): UserPlan
```

**Logic**:
- `providers === -1` means unlimited
- Returns `{ allowed: true/false, current, limit, planRequired }` for upgrade guidance
- Feature access matrix:

| Feature | Free | Starter | Pro | Enterprise |
|---------|:----:|:-------:|:---:|:----------:|
| Basic Dashboard | Y | Y | Y | Y |
| Budget Alerts | N | Y | Y | Y |
| CSV Export | N | Y | Y | Y |
| Advanced Analytics | N | N | Y | Y |
| Optimization Tips | N | N | Y | Y |
| Team Members | N | Y | Y | Y |

### 3.4 `features/billing/hooks/useBilling.ts` (NEW)

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import type { BillingStatus, SubscriptionInfo, PaymentHistory } from '@/types'

interface UseBillingResult {
  subscription: SubscriptionInfo | null
  invoices: PaymentHistory[]
  isLoading: boolean
  error: string | null
  createCheckout: (priceId: string) => Promise<void>
  openPortal: () => Promise<void>
  refreshStatus: () => Promise<void>
}

export function useBilling(): UseBillingResult
```

**Behavior**:
- `createCheckout(priceId)`: POST to `/api/billing/checkout`, then `window.location.href = url`
- `openPortal()`: POST to `/api/billing/portal`, then `window.location.href = url`
- `refreshStatus()`: GET `/api/billing/status`, updates local state
- Requires auth cookie (automatic via fetch)
- Error handling with user-friendly messages

### 3.5 `app/billing/success/page.tsx` (NEW)

Checkout success confirmation page.

```typescript
'use client'

// URL: /billing/success?session_id={CHECKOUT_SESSION_ID}

export default function BillingSuccessPage()
```

**UI**:
- Centered card layout
- Success icon (CheckCircle, green)
- "Subscription Activated!" heading
- Plan name and billing details
- "Go to Dashboard" button → `/dashboard`
- Auto-redirect to dashboard after 5 seconds
- If `session_id` missing, redirect to `/pricing`

**Styling**: Matches existing auth page patterns (centered card on gray-50 bg)

---

## 4. API Route Specifications

### 4.1 `POST /api/billing/checkout` (NEW)

Creates a Stripe Checkout Session for subscription.

**Request**:
```typescript
{
  priceId: string  // Stripe Price ID (STRIPE_PRICE_STARTER, etc.)
}
```

**Response** (200):
```typescript
{ url: string }  // Stripe Checkout URL
```

**Logic**:
1. Get auth token from cookies → get user from bkend `/auth/me`
2. If user has `stripeCustomerId`, reuse it
3. If not, create Stripe Customer (`stripe.customers.create`) with user email/name
4. Save `stripeCustomerId` to bkend user via PATCH
5. Create Checkout Session:
   - `mode: 'subscription'`
   - `customer: stripeCustomerId`
   - `line_items: [{ price: priceId, quantity: 1 }]`
   - `subscription_data: { trial_period_days: 14 }` (for starter/pro)
   - `success_url: '/billing/success?session_id={CHECKOUT_SESSION_ID}'`
   - `cancel_url: '/pricing'`
   - `metadata: { userId, orgId }`
6. Return `{ url: session.url }`

**Error Cases**:
- 401: No auth token
- 400: Invalid priceId
- 400: User already has active subscription (redirect to portal)
- 500: Stripe API error

### 4.2 `POST /api/billing/webhook` (NEW)

Handles Stripe webhook events.

**Request**: Raw body (Stripe signature verification)

**Headers**: `stripe-signature` header required

**Events Handled**:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set user.plan, subscriptionId, subscriptionStatus, currentPeriodEnd |
| `customer.subscription.updated` | Update plan (upgrade/downgrade), status, period end |
| `customer.subscription.deleted` | Set plan='free', status='canceled', clear subscription fields |
| `invoice.payment_succeeded` | Record in payment_history table |
| `invoice.payment_failed` | Set status='past_due', (optionally) create alert |

**Logic**:
1. Read raw body with `request.text()` (NOT json)
2. Verify signature: `stripe.webhooks.constructEvent(body, sig, webhookSecret)`
3. Extract event type and data
4. Look up user by `stripeCustomerId` in metadata or customer field
5. Update bkend DB accordingly
6. Return 200 (Stripe requires success response)

**Security**:
- `STRIPE_WEBHOOK_SECRET` for signature verification
- Idempotency: check event ID to skip duplicates (optional for v1)

**Config**: Must export `config = { api: { bodyParser: false } }` for raw body access. In App Router, use `request.text()` directly.

### 4.3 `POST /api/billing/portal` (NEW)

Creates a Stripe Customer Portal session.

**Request**: Empty body (uses auth cookie)

**Response** (200):
```typescript
{ url: string }  // Stripe Portal URL
```

**Logic**:
1. Get auth token → get user
2. If no `stripeCustomerId`, return 400 error
3. Create portal session: `stripe.billingPortal.sessions.create({ customer, return_url: '/settings' })`
4. Return `{ url: session.url }`

### 4.4 `GET /api/billing/status` (NEW)

Returns current subscription status and recent invoices.

**Response** (200):
```typescript
{
  subscription: {
    plan: UserPlan
    status: SubscriptionStatus
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    trialEnd?: string
    stripeCustomerId?: string
    subscriptionId?: string
  },
  invoices: PaymentHistory[]  // last 3
}
```

**Logic**:
1. Get auth token → get user from bkend
2. Build `subscription` from user fields (plan, subscriptionStatus, etc.)
3. If `stripeCustomerId` exists, fetch last 3 invoices from Stripe:
   `stripe.invoices.list({ customer, limit: 3 })`
4. Map to `PaymentHistory` format
5. Return combined response

**Fallback**: If no Stripe customer, return plan='free' with empty invoices

---

## 5. Modified Component Specifications

### 5.1 `app/(dashboard)/settings/page.tsx` (MODIFY)

Replace mock Subscription card with live billing data.

**Changes**:
- Add `'use client'` (already present)
- Import `useBilling` hook
- Replace hardcoded "Pro Plan" with `subscription.plan`
- Show subscription status badge (active/trialing/past_due/canceled)
- Show next billing date from `currentPeriodEnd`
- Show trial info if `status === 'trialing'`
- Add "Manage Billing" button → calls `openPortal()`
- Add "Upgrade Plan" button → navigates to `/pricing`
- Show recent invoices list (last 3)

**Subscription Card Layout**:
```
┌─────────────────────────────────────────────┐
│ Subscription                                │
│                                             │
│ [Pro Plan Badge]  [Active Badge]            │
│ $99/month                                   │
│ Next billing: March 15, 2026                │
│                                             │
│ ── or if trialing ──                        │
│ [Pro Plan Badge]  [Trial Badge]             │
│ 12 days remaining in trial                  │
│ Trial ends: March 1, 2026                   │
│                                             │
│ [Manage Billing]  [Change Plan]             │
│                                             │
│ Recent Invoices                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Feb 15, 2026  $99.00  Paid  [Download] │ │
│ │ Jan 15, 2026  $99.00  Paid  [Download] │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 5.2 `app/pricing/page.tsx` (MODIFY)

Make pricing page dynamic based on login state.

**Changes**:
- Convert to `'use client'` component
- Import `useAppStore` to check `currentUser`
- Import `useBilling` for checkout
- If logged in:
  - Show "Current Plan" badge on user's active plan
  - CTA changes: "Upgrade" (higher plans), "Downgrade" (lower plans), "Current Plan" (same)
  - Clicking Upgrade → calls `createCheckout(priceId)`
  - Clicking Downgrade → opens portal (Stripe handles downgrade)
- If not logged in:
  - Keep existing behavior (CTA → `/signup`)
- Enterprise: "Contact Sales" → `mailto:sales@llmcost.io`

**Plan Order Ranking** (for upgrade/downgrade detection):
```typescript
const PLAN_RANK: Record<UserPlan, number> = {
  free: 0, starter: 1, pro: 2, enterprise: 3
}
```

### 5.3 `middleware.ts` (MODIFY)

Add `/billing` routes to auth-protected paths.

```typescript
// Add to protected routes check:
pathname.startsWith('/billing')

// Add to matcher config:
'/billing/:path*'
```

### 5.4 `lib/constants.ts` (MODIFY)

Add Stripe Price ID mapping.

```typescript
export const STRIPE_PRICES: Record<Exclude<UserPlan, 'free'>, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
}

export const PLAN_RANK: Record<UserPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
}
```

### 5.5 `lib/store.ts` (MODIFY)

Extend User interface in store to include plan.

```typescript
interface User {
  id: string
  email: string
  name: string
  plan?: UserPlan  // NEW: for plan display in UI
}
```

---

## 6. Implementation Order

### Phase 1: Foundation (Types, Stripe Client, Plan Limits)
1. `npm install stripe @stripe/stripe-js`
2. Create `types/billing.ts` - all billing types
3. Modify `types/user.ts` - add Stripe fields
4. Modify `types/index.ts` - add exports
5. Create `lib/stripe.ts` - server-side Stripe client
6. Create `lib/stripe-client.ts` - client-side Stripe loader
7. Create `lib/plan-limits.ts` - plan enforcement utility
8. Modify `lib/constants.ts` - add STRIPE_PRICES, PLAN_RANK

### Phase 2: API Routes
9. Create `app/api/billing/checkout/route.ts`
10. Create `app/api/billing/webhook/route.ts`
11. Create `app/api/billing/portal/route.ts`
12. Create `app/api/billing/status/route.ts`

### Phase 3: Client Integration
13. Create `features/billing/hooks/useBilling.ts`
14. Create `app/billing/success/page.tsx`
15. Modify `middleware.ts` - protect billing routes

### Phase 4: UI Updates
16. Modify `app/(dashboard)/settings/page.tsx` - real subscription data
17. Modify `app/pricing/page.tsx` - dynamic CTA
18. Modify `lib/store.ts` - add plan to User interface

### Phase 5: Plan Enforcement
19. Add plan limit checks to existing API routes:
    - `POST /api/providers` (provider count check)
    - Dashboard/chart APIs (history days check)
    - (Members check - when team invite exists)

---

## 7. File Change Matrix

### New Files (8)

| # | File | LOC (est.) | Purpose |
|---|------|:----------:|---------|
| 1 | `types/billing.ts` | ~50 | Billing type definitions |
| 2 | `lib/stripe.ts` | ~35 | Server-side Stripe client & utils |
| 3 | `lib/stripe-client.ts` | ~12 | Client-side Stripe loader |
| 4 | `lib/plan-limits.ts` | ~60 | Plan enforcement utility |
| 5 | `app/api/billing/checkout/route.ts` | ~70 | Checkout session creation |
| 6 | `app/api/billing/webhook/route.ts` | ~100 | Stripe webhook handler |
| 7 | `app/api/billing/portal/route.ts` | ~35 | Customer portal session |
| 8 | `app/api/billing/status/route.ts` | ~55 | Subscription status query |
| 9 | `app/billing/success/page.tsx` | ~50 | Checkout success page |
| 10 | `features/billing/hooks/useBilling.ts` | ~65 | Billing state hook |

### Modified Files (6)

| # | File | Changes |
|---|------|---------|
| 1 | `types/user.ts` | Add 6 Stripe fields to User interface |
| 2 | `types/index.ts` | Add billing type exports |
| 3 | `app/(dashboard)/settings/page.tsx` | Replace mock subscription with live data |
| 4 | `app/pricing/page.tsx` | Dynamic CTA, 'use client', checkout integration |
| 5 | `lib/constants.ts` | Add STRIPE_PRICES, PLAN_RANK |
| 6 | `middleware.ts` | Add /billing to protected routes |
| 7 | `lib/store.ts` | Add plan to User interface |

---

## 8. Environment Variables

```env
# .env.local (add to existing)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

**Note**: In production, use `sk_live_*` keys. Test mode keys have `sk_test_*` prefix.

---

## 9. Stripe Dashboard Setup (Pre-requisite)

Before implementation, configure in Stripe Dashboard:

1. **Products** (3 paid plans):
   - Starter ($29/mo, recurring)
   - Pro ($99/mo, recurring)
   - Enterprise ($299/mo, recurring)

2. **Customer Portal Settings**:
   - Enable: Payment method update, Invoice history, Subscription cancel
   - Disable: Subscription pause (not supported in v1)

3. **Webhook Endpoint**:
   - URL: `https://{domain}/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

4. **Test Mode**:
   - Use test cards: `4242 4242 4242 4242` (success)
   - Use test clock for trial simulation

---

## 10. Error Handling Strategy

| Scenario | User Impact | Handling |
|----------|------------|---------|
| Checkout creation fails | Cannot subscribe | Show toast error, log to console |
| Webhook signature invalid | Silent | Return 400, Stripe retries |
| Webhook event processing fails | Plan not updated | Return 500, Stripe retries (up to 3 days) |
| Portal creation fails | Cannot manage billing | Show error, suggest retry |
| Status query fails | Cannot see subscription | Show cached user.plan from store |
| Plan limit exceeded | Action blocked | 403 + upgrade prompt message |
| Payment fails (invoice) | Service at risk | Set past_due, show warning banner |

---

## 11. Implementation Checklist

### Types & Config
- [ ] 1. Create `types/billing.ts` with SubscriptionStatus, SubscriptionInfo, PaymentHistory, CheckoutRequest, CheckoutResponse, PortalResponse, BillingStatus, PlanLimitCheck
- [ ] 2. Modify `types/user.ts` - add stripeCustomerId, subscriptionId, subscriptionStatus, currentPeriodEnd, cancelAtPeriodEnd, trialEnd
- [ ] 3. Modify `types/index.ts` - add billing exports
- [ ] 4. Modify `lib/constants.ts` - add STRIPE_PRICES, PLAN_RANK

### Stripe Clients
- [ ] 5. Create `lib/stripe.ts` - server Stripe client, STRIPE_PRICES, priceIdToPlan(), planToPriceId()
- [ ] 6. Create `lib/stripe-client.ts` - client loadStripe singleton
- [ ] 7. Create `lib/plan-limits.ts` - checkProviderLimit, checkHistoryLimit, checkMemberLimit, isFeatureAvailable

### API Routes
- [ ] 8. Create `app/api/billing/checkout/route.ts` - POST handler with customer creation, trial_period_days
- [ ] 9. Create `app/api/billing/webhook/route.ts` - POST handler with signature verification, 5 event types
- [ ] 10. Create `app/api/billing/portal/route.ts` - POST handler with portal session
- [ ] 11. Create `app/api/billing/status/route.ts` - GET handler with subscription + invoices

### Client Integration
- [ ] 12. Create `features/billing/hooks/useBilling.ts` - createCheckout, openPortal, refreshStatus
- [ ] 13. Create `app/billing/success/page.tsx` - success confirmation with auto-redirect
- [ ] 14. Modify `middleware.ts` - add /billing to protected routes and matcher

### UI Updates
- [ ] 15. Modify `app/(dashboard)/settings/page.tsx` - live subscription data, invoices, manage/upgrade buttons
- [ ] 16. Modify `app/pricing/page.tsx` - 'use client', dynamic CTA (Current/Upgrade/Downgrade), checkout integration
- [ ] 17. Modify `lib/store.ts` - add plan field to User interface

### Plan Enforcement
- [ ] 18. Add provider count check in relevant API (checkProviderLimit before creating provider)
- [ ] 19. Add history days limit in dashboard/chart API (filter by PLAN_LIMITS[plan].historyDays)

### Build & Verify
- [ ] 20. npm install stripe @stripe/stripe-js
- [ ] 21. npm run build passes with 0 errors
- [ ] 22. All existing pages render correctly
