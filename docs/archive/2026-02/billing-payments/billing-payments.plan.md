# Billing & Payments (billing-payments) Plan Document

> **Feature**: Billing & Payments - Stripe 결제 연동 & 구독 관리
>
> **Project**: LLM Cost Manager
> **Author**: Solo Founder
> **Date**: 2026-02-15
> **Status**: Draft
> **Level**: Dynamic

---

## 1. Feature Overview

### 1.1 Problem Statement

LLM Cost Manager는 4개 가격 플랜(Free $0, Starter $29, Pro $99, Enterprise $299)을 정의했지만, 실제 결제 및 구독 관리 기능이 전혀 구현되어 있지 않습니다:

- **결제 프로세서 없음**: Stripe, Paddle 등 결제 게이트웨이 미연동
- **구독 관리 불가**: 업그레이드/다운그레이드/취소 기능 없음
- **플랜 제한 미적용**: `PLAN_LIMITS`가 정의되어 있으나 런타임에서 적용되지 않음
- **Settings 페이지 목업**: Subscription 섹션이 하드코딩된 "Pro Plan" 표시
- **결제 이력 없음**: 인보이스, 결제 내역 조회 불가
- **무료 체험 미구현**: Starter/Pro 플랜의 "Start Free Trial" 버튼이 signup으로만 리다이렉트

### 1.2 Proposed Solution

**Stripe** 결제 플랫폼을 연동하여 완전한 SaaS 빌링 시스템 구축:

1. **Stripe Checkout**: 구독 결제 플로우 (Pricing → Checkout → Success)
2. **Stripe Customer Portal**: 결제 수단/인보이스 셀프서비스 관리
3. **Subscription Lifecycle**: 생성, 업그레이드, 다운그레이드, 취소, 재활성화
4. **Webhook Handler**: 결제 성공/실패, 구독 변경 이벤트 처리
5. **Plan Enforcement**: API 레벨에서 플랜 제한 실시간 적용
6. **Free Trial**: 14일 무료 체험 (Starter/Pro)
7. **Billing Dashboard**: 현재 구독, 결제 이력, 인보이스 조회

### 1.3 Why Stripe?

| 기준 | Stripe | Paddle | LemonSqueezy |
|------|--------|--------|--------------|
| SaaS 구독 지원 | ✅ 네이티브 | ✅ MoR | ✅ MoR |
| Checkout 세션 | ✅ Hosted/Embedded | ✅ Overlay | ✅ Overlay |
| Customer Portal | ✅ 내장 | ❌ 커스텀 필요 | ⚠️ 제한적 |
| Webhook 안정성 | ✅ 업계 최고 | ✅ Good | ⚠️ 제한적 |
| 글로벌 결제 | ✅ 135+ 통화 | ✅ MoR로 간편 | ⚠️ 제한적 |
| Next.js 호환성 | ✅ @stripe/stripe-js | ✅ paddle.js | ✅ lemonsqueezy.js |
| 개발자 경험 | ✅ 최고 수준 | ⚠️ 보통 | ⚠️ 보통 |
| 가격 | 2.9% + $0.30 | 5% + $0.50 | 5% + $0.50 |

**선택: Stripe** - 최고 수준의 개발자 경험, Customer Portal 내장, 가장 낮은 수수료

### 1.4 Value Proposition

- **수익화 실현**: Free → Paid 전환 퍼널 구축
- **셀프서비스**: 사용자가 직접 구독 관리, CS 부담 최소화
- **자동화**: Webhook으로 결제 상태 자동 동기화
- **플랜 적용**: 실제 기능 제한으로 업그레이드 동기 부여

---

## 2. Functional Requirements

### FR-01: Stripe Product & Price 설정

- Stripe Dashboard에서 4개 Product 생성 (Free, Starter, Pro, Enterprise)
- 각 Product에 월간(monthly) Price 생성
- Price ID를 환경 변수로 관리
- Free 플랜은 Stripe 없이 기본 제공 (결제 불필요)

### FR-02: Checkout Session (구독 시작)

- Pricing 페이지에서 "Start Free Trial" / "Get Started" 클릭 시 Checkout 세션 생성
- `/api/billing/checkout` POST 엔드포인트
- Stripe Hosted Checkout 사용 (보안, PCI 준수 자동)
- 성공 시 `/billing/success?session_id={id}`로 리다이렉트
- 취소 시 `/pricing`으로 리다이렉트
- 로그인 필수 (미로그인 시 signup → checkout 플로우)

### FR-03: Free Trial (14일 무료 체험)

- Starter/Pro 플랜에 14일 trial_period 적용
- Trial 기간 중 전체 기능 사용 가능
- Trial 종료 시 자동 결제 (결제 수단 미등록 시 Free로 다운그레이드)
- Dashboard에 Trial 남은 일수 표시
- Trial 종료 3일 전 이메일 알림 (Stripe 자동)

### FR-04: Subscription Management (구독 관리)

- Settings > Subscription에서 현재 플랜 확인
- 업그레이드: 즉시 적용, 차액 비례 계산 (proration)
- 다운그레이드: 현재 빌링 주기 종료 시 적용
- 취소: 현재 주기 종료까지 유지 후 Free로 전환
- 재활성화: 취소 예정 구독을 되살리기

### FR-05: Stripe Customer Portal

- `/api/billing/portal` POST 엔드포인트
- Settings에서 "Manage Billing" 클릭 시 Stripe Customer Portal 열기
- Portal에서 제공: 결제 수단 변경, 인보이스 다운로드, 구독 취소
- Portal 세션 완료 후 `/settings`로 리다이렉트

### FR-06: Webhook Handler

- `/api/billing/webhook` POST 엔드포인트
- Stripe Webhook Secret으로 서명 검증
- 처리할 이벤트:
  - `checkout.session.completed` → 구독 생성, User.plan 업데이트
  - `customer.subscription.updated` → 플랜 변경 반영
  - `customer.subscription.deleted` → Free로 다운그레이드
  - `invoice.payment_succeeded` → 결제 성공 기록
  - `invoice.payment_failed` → 결제 실패 알림, 유예 기간 시작
- 멱등성 보장 (이벤트 ID 기반 중복 처리 방지)

### FR-07: Plan Enforcement (플랜 제한 적용)

- API 미들웨어에서 플랜 기반 제한 체크
- Provider 추가 시: `PLAN_LIMITS[plan].providers` 체크
- 히스토리 조회 시: `PLAN_LIMITS[plan].historyDays` 체크
- 팀 멤버 초대 시: `PLAN_LIMITS[plan].members` 체크
- 제한 초과 시 403 응답 + 업그레이드 안내 메시지
- Free 사용자: Optimization Tips, Advanced Analytics 접근 제한

### FR-08: Billing Dashboard (결제 대시보드)

- Settings > Subscription 섹션 리뉴얼
- 현재 플랜, 다음 결제일, 결제 금액 표시
- Trial 상태 및 남은 일수 (해당 시)
- 최근 인보이스 3건 표시 (Stripe에서 조회)
- "Manage Billing" → Stripe Customer Portal
- "Upgrade Plan" → Checkout 플로우

### FR-09: Pricing Page Enhancement

- 현재 플랜에 "Current Plan" 배지 표시
- 로그인 사용자: CTA를 "Upgrade" / "Downgrade" / "Current Plan"으로 동적 변경
- 비로그인 사용자: 기존 "Get Started" / "Start Free Trial" 유지
- Enterprise: "Contact Sales" → mailto 또는 Calendly 링크

### FR-10: Subscription Status Sync

- User 모델에 구독 관련 필드 추가 (stripeCustomerId, subscriptionStatus 등)
- 앱 로딩 시 bkend DB와 Stripe 상태 동기화
- Webhook이 주 동기화 채널, API 조회는 fallback

---

## 3. Non-Functional Requirements

### NFR-01: Security

- Stripe Secret Key는 서버사이드에서만 사용 (STRIPE_SECRET_KEY)
- Webhook 서명 검증 필수 (STRIPE_WEBHOOK_SECRET)
- Checkout 세션은 서버에서만 생성 (client에서 직접 호출 금지)
- PCI DSS 준수: Stripe Hosted Checkout 사용으로 카드 정보 미취급

### NFR-02: Reliability

- Webhook 실패 시 Stripe 자동 재시도 (최대 3일)
- 멱등성 키로 중복 처리 방지
- 결제 실패 시 3일 유예 기간 후 다운그레이드

### NFR-03: Performance

- Checkout 세션 생성: < 2초
- Webhook 처리: < 5초 (Stripe timeout)
- Settings 페이지 구독 정보 로딩: < 1초

### NFR-04: UX

- 결제 플로우에서 페이지 이탈 최소화 (Stripe Hosted Checkout)
- 플랜 변경 시 즉각적 UI 피드백
- 결제 실패 시 명확한 안내 메시지

---

## 4. Technical Research

### 4.1 Stripe Integration Architecture

```
Client (Next.js)          Server (API Routes)           Stripe
─────────────────────     ─────────────────────         ──────
Pricing Page ─────────→   POST /api/billing/checkout ──→ Create Checkout Session
  ↓                         ↓
Stripe Checkout (Hosted)   Return session URL
  ↓
Success Page ←────────    GET /api/billing/status

                          POST /api/billing/webhook ←── Stripe Events
                            ↓
                          Update bkend DB (User.plan)

Settings Page ────────→   POST /api/billing/portal ───→ Create Portal Session
  ↓
Stripe Customer Portal
```

### 4.2 Required Packages

```bash
npm install stripe @stripe/stripe-js
```

- `stripe`: Server-side SDK (API Routes에서 사용)
- `@stripe/stripe-js`: Client-side SDK (Checkout 리다이렉트에 사용)

### 4.3 Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...           # Stripe Secret Key (server only)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Stripe Publishable Key (client)
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signing secret

STRIPE_PRICE_STARTER=price_...          # Starter 월간 Price ID
STRIPE_PRICE_PRO=price_...              # Pro 월간 Price ID
STRIPE_PRICE_ENTERPRISE=price_...       # Enterprise 월간 Price ID
```

### 4.4 Existing Infrastructure

| Component | Status | Action |
|-----------|--------|--------|
| Pricing Page | ✅ Working | FR-09에서 동적 CTA 추가 |
| Settings Page | ✅ Mock | FR-08에서 실제 구독 정보로 교체 |
| User type | ✅ Has `plan` field | FR-10에서 Stripe 필드 추가 |
| Organization | ✅ Has `billingEmail` | FR-05에서 Portal에 활용 |
| PLAN_LIMITS | ✅ Defined | FR-07에서 런타임 적용 |
| Middleware | ✅ Auth check | FR-07에서 plan enforcement 추가 |
| bkend client | ✅ Working | Stripe 데이터 저장에 활용 |

### 4.5 bkend.ai Data Storage

Stripe 관련 데이터를 bkend DB에 저장:

```
users 테이블 확장:
  - stripeCustomerId: string
  - subscriptionId: string
  - subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  - currentPeriodEnd: string (ISO date)
  - cancelAtPeriodEnd: boolean

새 테이블 - payment_history:
  - id: string
  - orgId: string
  - stripeInvoiceId: string
  - amount: number
  - currency: string
  - status: 'paid' | 'failed' | 'pending'
  - paidAt: string
  - invoiceUrl: string
```

---

## 5. Implementation Phases

### Phase 1: Stripe Setup & Checkout (FR-01, FR-02, FR-03)

- Stripe SDK 설치 및 환경 변수 설정
- `lib/stripe.ts` 클라이언트 생성
- `/api/billing/checkout` 엔드포인트 구현
- Checkout Success/Cancel 페이지
- 14일 Trial 설정

### Phase 2: Webhook Handler (FR-06, FR-10)

- `/api/billing/webhook` 엔드포인트 구현
- 이벤트 핸들러 (checkout.completed, subscription.updated/deleted, invoice events)
- User.plan 자동 동기화
- Subscription 상태 필드 추가

### Phase 3: Customer Portal & Settings (FR-05, FR-08)

- `/api/billing/portal` 엔드포인트 구현
- Settings > Subscription 섹션 리뉴얼
- 현재 플랜, 결제일, Trial 상태 표시
- "Manage Billing" 버튼 연동

### Phase 4: Plan Enforcement (FR-07)

- Plan enforcement 미들웨어/유틸리티 생성
- Provider 추가, 히스토리 조회, 멤버 초대에 제한 적용
- 403 응답 + 업그레이드 안내

### Phase 5: Pricing Page & UX (FR-04, FR-09)

- Pricing 페이지 동적 CTA
- 업그레이드/다운그레이드 플로우
- Trial 배너 (Dashboard)

---

## 6. Data Model Changes

### 6.1 User (수정)

```typescript
export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  plan: UserPlan
  // NEW: Stripe fields
  stripeCustomerId?: string
  subscriptionId?: string
  subscriptionStatus?: SubscriptionStatus
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  trialEnd?: string
  createdAt: string
  updatedAt: string
}

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
```

### 6.2 PaymentHistory (신규)

```typescript
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
```

### 6.3 Stripe Config (신규)

```typescript
export interface StripePriceConfig {
  starter: string   // price_xxx
  pro: string       // price_xxx
  enterprise: string // price_xxx
}
```

---

## 7. File Change Matrix

### New Files (8)

| # | File | Purpose |
|---|------|---------|
| 1 | `lib/stripe.ts` | Stripe client 초기화 & 유틸리티 |
| 2 | `app/api/billing/checkout/route.ts` | Checkout 세션 생성 |
| 3 | `app/api/billing/webhook/route.ts` | Stripe Webhook 핸들러 |
| 4 | `app/api/billing/portal/route.ts` | Customer Portal 세션 생성 |
| 5 | `app/api/billing/status/route.ts` | 구독 상태 조회 |
| 6 | `app/billing/success/page.tsx` | Checkout 성공 페이지 |
| 7 | `features/billing/hooks/useBilling.ts` | 빌링 상태 훅 |
| 8 | `types/billing.ts` | 빌링 관련 타입 정의 |

### Modified Files (6)

| # | File | Changes |
|---|------|---------|
| 1 | `types/user.ts` | Stripe 필드 추가 (stripeCustomerId, subscriptionStatus 등) |
| 2 | `app/(dashboard)/settings/page.tsx` | Subscription 섹션 실제 데이터 연동 |
| 3 | `app/pricing/page.tsx` | 동적 CTA, 로그인 사용자 플랜 표시 |
| 4 | `lib/constants.ts` | Stripe Price ID 매핑 추가 |
| 5 | `middleware.ts` | Plan enforcement 로직 추가 |
| 6 | `types/index.ts` | 새 타입 export 추가 |

---

## 8. Risk Matrix

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Stripe API 키 노출 | Critical | Low | Server-side only, env vars, .gitignore |
| Webhook 처리 실패 → 플랜 미동기화 | High | Medium | 멱등성 처리, Stripe 자동 재시도, fallback API 조회 |
| 결제 실패 시 서비스 중단 | Medium | Low | 3일 유예 기간, 명확한 결제 실패 안내 |
| PCI 준수 위반 | Critical | Low | Stripe Hosted Checkout으로 카드 정보 미취급 |
| Trial 악용 (반복 가입) | Low | Medium | stripeCustomerId로 기존 고객 체크 |
| Enterprise "Contact Sales" 전환 | Medium | Medium | Calendly 링크 + 자동 알림 |

---

## 9. Success Criteria

| Metric | Target |
|--------|--------|
| Checkout → 결제 완료 플로우 | 정상 동작 |
| Webhook 이벤트 처리 | 6개 이벤트 타입 |
| Plan enforcement | 3개 제한 (providers, history, members) |
| Build 오류 | 0건 |
| 새 파일 | 8개 |
| 수정 파일 | 6개 |
| Gap Analysis Match Rate | >= 90% |

---

## 10. Out of Scope (v1)

- 연간 결제 (Annual billing) - v2에서 추가
- 쿠폰/할인 코드 - v2에서 추가
- Usage-based billing (토큰 사용량 기반 과금) - v2에서 추가
- 다중 통화 지원 - v2에서 추가
- Tax 자동 계산 (Stripe Tax) - v2에서 추가
- Enterprise 커스텀 견적 - 수동 대응
