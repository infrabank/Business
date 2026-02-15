# LLM Cost Manager Design Document

> **Summary**: LLM 비용 통합 관리 SaaS 플랫폼의 시스템 설계
>
> **Project**: AI Gold Rush Essential Service
> **Version**: 0.1.0
> **Author**: Solo Founder
> **Date**: 2026-02-15
> **Status**: Draft
> **Planning Doc**: [business-setup.plan.md](../01-plan/features/business-setup.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | [Schema Definition](../01-plan/schema.md) | ✅ |
| Phase 2 | Coding Conventions | ❌ (다음 단계) |
| Phase 3 | Mockup | ❌ (다음 단계) |
| Phase 4 | API Spec | 본 문서에 포함 |

---

## 1. Overview

### 1.1 Design Goals

- 3개 LLM 프로바이더의 비용 데이터를 단일 대시보드에 통합
- 1인 개발자가 유지보수 가능한 단순한 아키텍처
- MVP를 2-3개월 내에 출시할 수 있는 실용적 설계
- 프로바이더 추가가 어댑터 하나로 가능한 확장성

### 1.2 Design Principles

- **Feature-Based Modules**: 기능별로 코드를 격리하여 독립적 개발/테스트
- **Adapter Pattern**: LLM 프로바이더 통합에 어댑터 패턴으로 유연성 확보
- **Server-First Data Fetching**: Next.js App Router의 Server Components 활용
- **Progressive Enhancement**: 핵심 기능 먼저, 부가 기능은 점진적으로

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                   │
│    Next.js App Router (React Server Components)       │
│    ┌─────────┐  ┌──────────┐  ┌─────────────────┐  │
│    │  Auth   │  │Dashboard │  │  Provider Mgmt  │  │
│    │  Pages  │  │  Charts  │  │   API Key Mgmt  │  │
│    └────┬────┘  └────┬─────┘  └───────┬─────────┘  │
│         └────────────┼────────────────┘             │
│                      │                               │
├──────────────────────┼───────────────────────────────┤
│              Next.js API Routes                       │
│    ┌─────────────────┼──────────────────────┐        │
│    │          Service Layer                   │        │
│    │  ┌──────────┐ ┌──────────┐ ┌────────┐ │        │
│    │  │Usage Sync│ │ Budget   │ │Optimize│ │        │
│    │  │ Service  │ │ Service  │ │Service │ │        │
│    │  └────┬─────┘ └────┬─────┘ └───┬────┘ │        │
│    └───────┼────────────┼───────────┼──────┘        │
│            │            │           │                 │
├────────────┼────────────┼───────────┼─────────────────┤
│     Provider Adapters   │    bkend.ai BaaS            │
│  ┌────────┐┌────────┐  │  ┌──────────────────┐      │
│  │OpenAI  ││Claude  │  │  │  Auth (JWT)      │      │
│  │Adapter ││Adapter │  │  │  Database (CRUD)  │      │
│  └────┬───┘└───┬────┘  │  │  File Storage     │      │
│       │        │        │  └──────────────────┘      │
├───────┼────────┼────────┼─────────────────────────────┤
│  External APIs │        │                              │
│  ┌────────┐┌───┴────┐┌─┴──────┐                      │
│  │OpenAI  ││Anthro- ││Google  │                       │
│  │  API   ││pic API ││AI API  │                       │
│  └────────┘└────────┘└────────┘                       │
└─────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. 사용량 수집 (Cron/Manual Trigger)
   Scheduler → UsageSyncService → ProviderAdapter → LLM API
                                                      ↓
                                              Usage Data (JSON)
                                                      ↓
                                     UsageSyncService → bkend.ai DB (UsageRecord)

2. 대시보드 조회
   Browser → Next.js Page (Server Component)
                  ↓
           Server: fetch bkend.ai DB → Aggregate → Return Props
                  ↓
           Client: Recharts render charts

3. 예산 알림
   UsageSyncService (after sync)
          ↓
   BudgetService.checkThresholds()
          ↓
   If exceeded → AlertService.send() → Email / Web Push
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Dashboard Page | UsageRecord, Budget | 비용 시각화 |
| UsageSyncService | ProviderAdapters, bkend.ai | 사용량 데이터 수집 |
| BudgetService | UsageRecord, Budget, Alert | 예산 확인 및 알림 |
| ProviderAdapter | External LLM APIs | API별 사용량 조회 |
| OptimizationService | UsageRecord | 비용 절감 제안 생성 |

---

## 3. Data Model

> 상세 스키마: [schema.md](../01-plan/schema.md) 참조

### 3.1 Core Entities (요약)

| Entity | Primary Key | Core Fields |
|--------|-------------|-------------|
| User | id (UUID) | email, name, plan |
| Organization | id (UUID) | name, slug, ownerId |
| Provider | id (UUID) | type, orgId, isActive |
| ApiKey | id (UUID) | providerId, encryptedKey |
| UsageRecord | id (UUID) | model, tokens, cost, date |
| Budget | id (UUID) | orgId, amount, alertThresholds |
| Alert | id (UUID) | type, message, isRead |
| Project | id (UUID) | orgId, name, color |

### 3.2 bkend.ai Table Mapping

| Entity | bkend Table | RLS Policy |
|--------|-------------|------------|
| Organization | organizations | owner/member access |
| Provider | providers | org member access |
| ApiKey | api_keys | org admin+ access |
| UsageRecord | usage_records | org member access |
| Budget | budgets | org admin+ access |
| Alert | alerts | org member access |
| Project | projects | org member access |
| Member | members | org member access |
| OptimizationTip | optimization_tips | org member access |

---

## 4. API Specification

### 4.1 bkend.ai Auto-Generated CRUD

bkend.ai가 자동 생성하는 REST API (별도 구현 불필요):

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/organizations | 조직 목록 |
| POST | /api/organizations | 조직 생성 |
| GET | /api/providers?orgId={id} | 프로바이더 목록 |
| POST | /api/providers | 프로바이더 등록 |
| POST | /api/api-keys | API 키 등록 |
| GET | /api/usage-records?orgId={id}&date_gte={from}&date_lte={to} | 사용량 조회 |
| GET | /api/budgets?orgId={id} | 예산 목록 |
| POST | /api/budgets | 예산 설정 |
| GET | /api/alerts?orgId={id}&isRead=false | 미읽은 알림 |

### 4.2 Custom API Routes (Next.js)

bkend.ai CRUD 외 커스텀 로직이 필요한 엔드포인트:

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/sync/trigger | 사용량 수동 동기화 트리거 | Required |
| GET | /api/dashboard/summary | 대시보드 집계 데이터 | Required |
| GET | /api/dashboard/chart?period=7d | 차트용 시계열 데이터 | Required |
| GET | /api/reports/export?format=csv | CSV 리포트 내보내기 | Required |
| GET | /api/optimization/tips | 최적화 제안 목록 | Required |
| POST | /api/providers/validate | API 키 유효성 검증 | Required |

### 4.3 Dashboard Summary Response

```typescript
// GET /api/dashboard/summary
interface DashboardSummary {
  totalCost: {
    current: number       // 이번 달 총 비용
    previous: number      // 지난 달 총 비용
    changePercent: number  // 변화율
  }
  byProvider: {
    type: ProviderType
    cost: number
    tokenCount: number
    requestCount: number
  }[]
  byProject: {
    projectId: string
    name: string
    cost: number
    color: string
  }[]
  topModels: {
    model: string
    cost: number
    tokenCount: number
    avgCostPerRequest: number
  }[]
  budgetStatus: {
    budgetId: string
    name: string
    amount: number
    spent: number
    percentage: number
  }[]
  recentAlerts: Alert[]
}
```

---

## 5. UI/UX Design

### 5.1 Page Structure

```
┌──────────────────────────────────────────────────────────┐
│  NavBar  [Logo] [Dashboard] [Providers] [Budget] [⚙]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Total Cost  │ │ This Month  │ │ Budget      │       │
│  │   $1,234    │ │  vs Last    │ │ 67% Used    │       │
│  │  ▲ 12%      │ │  ▼ 5%       │ │ ████░░░░    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Cost Trend Chart (Line/Area)                     │   │
│  │  [7D] [30D] [90D] [Custom]                       │   │
│  │                                                    │   │
│  │  ___/\___/‾‾\__                                   │   │
│  │                                                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────────────┐ ┌────────────────────────────┐  │
│  │ By Provider (Pie)  │ │ By Model (Bar Chart)       │  │
│  │  ● OpenAI  45%     │ │  gpt-4o      ████████      │  │
│  │  ● Claude  35%     │ │  claude-3    ██████         │  │
│  │  ● Google  20%     │ │  gemini-2    ████           │  │
│  └────────────────────┘ └────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Optimization Tips                            [3]  │   │
│  │ 💡 gpt-4o → gpt-4o-mini 전환 시 $230/월 절감    │   │
│  │ 💡 미사용 API 키 2개 발견                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Page List

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | 마케팅 랜딩 페이지 |
| Login | `/login` | 로그인 |
| Signup | `/signup` | 회원가입 |
| Dashboard | `/dashboard` | 메인 대시보드 |
| Providers | `/providers` | 프로바이더 관리 |
| Provider Detail | `/providers/[id]` | API 키 관리 |
| Projects | `/projects` | 프로젝트 관리 |
| Budget | `/budget` | 예산 설정 |
| Alerts | `/alerts` | 알림 목록 |
| Reports | `/reports` | 비용 리포트 |
| Settings | `/settings` | 조직/계정 설정 |
| Pricing | `/pricing` | 가격 안내 |

### 5.3 User Flow

```
Landing → Signup → Create Org → Add Provider → Add API Key
              ↓                                      ↓
           Login ──→ Dashboard ←──── Auto Sync Usage Data
                        │
              ┌─────────┼──────────┐
              ↓         ↓          ↓
          View Charts  Set Budget  View Tips
              ↓         ↓          ↓
         Export CSV   Get Alerts  Apply Optimization
```

### 5.4 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| NavBar | src/components/layout/ | 내비게이션 |
| StatCard | src/components/dashboard/ | KPI 카드 (비용, 변화율) |
| CostTrendChart | src/features/dashboard/ | 비용 추세 라인 차트 |
| ProviderPieChart | src/features/dashboard/ | 프로바이더별 파이 차트 |
| ModelBarChart | src/features/dashboard/ | 모델별 막대 차트 |
| BudgetProgress | src/features/budget/ | 예산 진행률 바 |
| TipCard | src/features/optimization/ | 최적화 제안 카드 |
| ProviderForm | src/features/providers/ | 프로바이더/API키 등록 폼 |
| AlertList | src/features/alerts/ | 알림 목록 |
| DataTable | src/components/ui/ | 재사용 데이터 테이블 |

---

## 6. Provider Adapter Design

### 6.1 Adapter Interface

```typescript
// services/providers/base-adapter.ts
export interface UsageData {
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
  requestCount: number
  date: string
}

export interface ProviderAdapter {
  type: ProviderType
  validateKey(apiKey: string): Promise<boolean>
  fetchUsage(apiKey: string, from: Date, to: Date): Promise<UsageData[]>
  getAvailableModels(): Promise<string[]>
}
```

### 6.2 Provider Implementations

```
src/services/providers/
├── base-adapter.ts        # Interface definition
├── openai-adapter.ts      # OpenAI Usage API
├── anthropic-adapter.ts   # Anthropic Usage API
├── google-adapter.ts      # Google AI Usage API
└── index.ts               # Adapter factory
```

### 6.3 Adapter Factory

```typescript
// services/providers/index.ts
export function createAdapter(type: ProviderType): ProviderAdapter {
  switch (type) {
    case 'openai': return new OpenAIAdapter()
    case 'anthropic': return new AnthropicAdapter()
    case 'google': return new GoogleAdapter()
    default: throw new Error(`Unsupported provider: ${type}`)
  }
}
```

---

## 7. Security Considerations

- [x] API 키 AES-256-GCM 암호화 저장 (서버사이드에서만 복호화)
- [x] bkend.ai JWT 기반 인증 (Access 1h, Refresh 7d)
- [x] RLS (Row Level Security) - 조직별 데이터 격리
- [x] HTTPS 강제
- [x] API Route에 인증 미들웨어
- [x] Rate Limiting (API 호출 제한)
- [x] 민감 데이터 클라이언트 노출 금지 (encryptedKey 등)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | Service logic, Adapters | Vitest |
| Integration Test | API Routes | Vitest + fetch |
| E2E Test | User flows | Playwright |

### 8.2 Key Test Cases

- [ ] Provider adapter: 각 프로바이더 사용량 조회 정상 동작
- [ ] Budget threshold: 50%, 80%, 100% 알림 정확히 발송
- [ ] Dashboard aggregation: 비용 집계 정확성
- [ ] API Key encryption: 암호화/복호화 라운드트립
- [ ] Auth flow: 회원가입 → 로그인 → 대시보드 접근

---

## 9. Implementation Guide

### 9.1 File Structure

```
src/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx             # Dashboard layout (NavBar)
│   │   ├── dashboard/page.tsx
│   │   ├── providers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── projects/page.tsx
│   │   ├── budget/page.tsx
│   │   ├── alerts/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── sync/trigger/route.ts
│       ├── dashboard/
│       │   ├── summary/route.ts
│       │   └── chart/route.ts
│       ├── reports/export/route.ts
│       ├── optimization/tips/route.ts
│       └── providers/validate/route.ts
├── components/
│   ├── layout/
│   │   ├── NavBar.tsx
│   │   └── Footer.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── DataTable.tsx
│       └── Input.tsx
├── features/
│   ├── auth/
│   │   ├── components/
│   │   └── hooks/
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── StatCard.tsx
│   │   │   ├── CostTrendChart.tsx
│   │   │   ├── ProviderPieChart.tsx
│   │   │   └── ModelBarChart.tsx
│   │   └── hooks/
│   │       └── useDashboard.ts
│   ├── providers/
│   │   ├── components/
│   │   └── hooks/
│   ├── budget/
│   │   ├── components/
│   │   └── hooks/
│   ├── alerts/
│   │   ├── components/
│   │   └── hooks/
│   └── optimization/
│       ├── components/
│       └── hooks/
├── services/
│   ├── providers/
│   │   ├── base-adapter.ts
│   │   ├── openai-adapter.ts
│   │   ├── anthropic-adapter.ts
│   │   ├── google-adapter.ts
│   │   └── index.ts
│   ├── usage-sync.service.ts
│   ├── budget.service.ts
│   ├── optimization.service.ts
│   └── encryption.service.ts
├── lib/
│   ├── bkend.ts                   # bkend.ai client
│   ├── auth.ts                    # Auth helpers
│   └── utils.ts                   # Utilities
└── types/
    ├── user.ts
    ├── organization.ts
    ├── provider.ts
    ├── usage.ts
    ├── budget.ts
    ├── alert.ts
    ├── optimization.ts
    └── api.ts
```

### 9.2 Implementation Order

1. [ ] **Phase 0: 프로젝트 초기화**
   - Next.js 14 + Tailwind + TypeScript 설정
   - bkend.ai 연동 설정
   - ESLint + Prettier 설정

2. [ ] **Phase 1: 인증 & 기본 구조**
   - bkend.ai 인증 (회원가입/로그인)
   - Organization CRUD
   - Dashboard 레이아웃 (NavBar + Sidebar)

3. [ ] **Phase 2: 프로바이더 관리**
   - Provider/ApiKey CRUD
   - API 키 암호화/복호화
   - API 키 유효성 검증

4. [ ] **Phase 3: 사용량 수집**
   - Provider Adapter 구현 (OpenAI → Anthropic → Google)
   - UsageSyncService (수동 트리거)
   - UsageRecord 저장

5. [ ] **Phase 4: 대시보드**
   - Summary API
   - 비용 카드, 트렌드 차트
   - 프로바이더별/모델별 차트

6. [ ] **Phase 5: 예산 & 알림**
   - Budget CRUD
   - 임계값 확인 로직
   - Alert 생성 + 이메일 발송

7. [ ] **Phase 6: 최적화 & 리포트**
   - OptimizationService
   - CSV 내보내기
   - 최적화 제안 UI

---

## 10. Coding Convention Reference

> Phase 2 Convention 문서 완성 시 상세화 예정

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `StatCard`, `CostTrendChart` |
| Functions | camelCase | `fetchUsage()`, `handleSubmit()` |
| Constants | UPPER_SNAKE_CASE | `MAX_API_KEYS`, `ENCRYPTION_ALGORITHM` |
| Types/Interfaces | PascalCase | `UsageRecord`, `ProviderAdapter` |
| Files (component) | PascalCase.tsx | `StatCard.tsx` |
| Files (utility) | camelCase.ts or kebab-case.ts | `encryption.service.ts` |
| Folders | kebab-case | `usage-sync/`, `api-keys/` |

### 10.2 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `NEXT_PUBLIC_APP_URL` | 앱 URL | Client |
| `NEXT_PUBLIC_BKEND_URL` | bkend.ai API | Client |
| `BKEND_API_KEY` | bkend.ai 서버 키 | Server |
| `ENCRYPTION_KEY` | API 키 암호화 | Server |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-15 | Initial draft | Solo Founder |
