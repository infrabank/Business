# LLM Cost Manager Schema Definition

> PDCA Schema Document - 데이터 구조 및 용어 정의

**Version**: 1.0
**Created**: 2026-02-15
**Level**: Dynamic

---

## 1. Terminology (용어 정의)

| Term | Definition | Korean | Notes |
|------|------------|--------|-------|
| Provider | LLM API 서비스 제공자 | 프로바이더 | OpenAI, Anthropic, Google 등 |
| API Key | 프로바이더 인증 키 | API 키 | 암호화 저장 필수 |
| Token | LLM 입출력 기본 단위 | 토큰 | 프로바이더마다 계산법 다름 |
| Usage | 특정 기간의 API 사용 기록 | 사용량 | 토큰 수 + 비용 |
| Organization | 사용자가 속한 조직 단위 | 조직 | 팀 관리의 최상위 단위 |
| Project | 조직 내 비용 분류 단위 | 프로젝트 | 용도별 API 키 그룹핑 |
| Budget | 월 예산 한도 | 예산 | 초과 시 알림 발송 |
| Alert | 예산 초과/이상 감지 알림 | 알림 | 이메일/웹 푸시 |
| Model | LLM 모델 (gpt-4, claude-3 등) | 모델 | 프로바이더 내 하위 분류 |
| Cost | 사용량에 대한 금전적 비용 (USD) | 비용 | 항상 USD 기준 |
| Member | 조직에 속한 팀원 | 멤버 | role: owner/admin/viewer |
| Optimization | 비용 절감을 위한 제안 | 최적화 | 모델 다운그레이드 등 |

---

## 2. Entity Overview

| Entity | Description | Key Fields |
|--------|-------------|------------|
| User | 시스템 사용자 | id, email, name, plan |
| Organization | 팀/회사 단위 | id, name, ownerId |
| Member | 조직의 멤버 | userId, orgId, role |
| Provider | 연동된 LLM 프로바이더 | id, type, orgId |
| ApiKey | 프로바이더 API 키 | id, providerId, encryptedKey |
| Project | 비용 분류 프로젝트 | id, orgId, name |
| UsageRecord | API 사용 기록 | id, apiKeyId, model, tokens, cost, date |
| Budget | 월 예산 설정 | id, orgId, projectId, amount, period |
| Alert | 알림 기록 | id, orgId, type, message, sentAt |
| OptimizationTip | 최적화 제안 | id, orgId, suggestion, potentialSaving |

---

## 3. Entity Details

### 3.1 User

**Description**: 시스템 사용자. bkend.ai 인증으로 관리.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID (bkend.ai auto) |
| email | string | Y | 이메일 (unique) |
| name | string | Y | 표시 이름 |
| avatarUrl | string | N | 프로필 이미지 URL |
| plan | enum | Y | free/starter/pro/enterprise |
| createdAt | datetime | Y | 생성일시 |
| updatedAt | datetime | Y | 수정일시 |

**Relationships**:
- 1:N → Organization (소유한 조직)
- 1:N → Member (멤버십)

### 3.2 Organization

**Description**: 팀/회사 단위. 비용 관리의 최상위 그룹.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| name | string | Y | 조직 이름 |
| ownerId | string | Y | FK → User.id |
| slug | string | Y | URL 슬러그 (unique) |
| billingEmail | string | N | 청구용 이메일 |
| createdAt | datetime | Y | 생성일시 |
| updatedAt | datetime | Y | 수정일시 |

**Relationships**:
- N:1 → User (소유자)
- 1:N → Member (멤버 목록)
- 1:N → Provider (연동 프로바이더)
- 1:N → Project (프로젝트)
- 1:N → Budget (예산)
- 1:N → Alert (알림)

### 3.3 Member

**Description**: 조직과 사용자의 연결. 역할 기반 접근 제어.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| userId | string | Y | FK → User.id |
| orgId | string | Y | FK → Organization.id |
| role | enum | Y | owner / admin / viewer |
| joinedAt | datetime | Y | 가입일시 |

### 3.4 Provider

**Description**: 연동된 LLM API 프로바이더.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| orgId | string | Y | FK → Organization.id |
| type | enum | Y | openai / anthropic / google / azure / custom |
| name | string | Y | 표시 이름 (e.g., "Main OpenAI") |
| isActive | boolean | Y | 활성 상태 |
| lastSyncAt | datetime | N | 마지막 데이터 수집 시각 |
| createdAt | datetime | Y | 생성일시 |

**Relationships**:
- N:1 → Organization
- 1:N → ApiKey

### 3.5 ApiKey

**Description**: 프로바이더 API 키. 암호화 저장 필수.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| providerId | string | Y | FK → Provider.id |
| projectId | string | N | FK → Project.id (분류용) |
| label | string | Y | 키 라벨 (e.g., "Production Key") |
| encryptedKey | string | Y | AES-256 암호화된 API 키 |
| keyPrefix | string | Y | 키 앞 8자 (sk-proj-xxxx) |
| isActive | boolean | Y | 활성 상태 |
| createdAt | datetime | Y | 생성일시 |

**Relationships**:
- N:1 → Provider
- N:1 → Project (optional)
- 1:N → UsageRecord

### 3.6 Project

**Description**: 비용 분류를 위한 프로젝트 단위.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| orgId | string | Y | FK → Organization.id |
| name | string | Y | 프로젝트 이름 |
| description | string | N | 설명 |
| color | string | N | 대시보드 색상 코드 (#hex) |
| createdAt | datetime | Y | 생성일시 |

**Relationships**:
- N:1 → Organization
- 1:N → ApiKey
- 1:N → Budget

### 3.7 UsageRecord

**Description**: API 사용 기록. 일별로 집계하여 저장.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| apiKeyId | string | Y | FK → ApiKey.id |
| orgId | string | Y | FK → Organization.id (비정규화) |
| providerType | enum | Y | openai / anthropic / google |
| model | string | Y | 모델명 (e.g., "gpt-4o", "claude-sonnet-4-5-20250929") |
| inputTokens | number | Y | 입력 토큰 수 |
| outputTokens | number | Y | 출력 토큰 수 |
| totalTokens | number | Y | 총 토큰 수 |
| cost | number | Y | USD 비용 (소수점 6자리) |
| requestCount | number | Y | API 호출 횟수 |
| date | date | Y | 사용 날짜 (YYYY-MM-DD) |
| createdAt | datetime | Y | 레코드 생성일시 |

**Relationships**:
- N:1 → ApiKey
- N:1 → Organization

### 3.8 Budget

**Description**: 월 예산 설정. 조직 또는 프로젝트 단위.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| orgId | string | Y | FK → Organization.id |
| projectId | string | N | FK → Project.id (null이면 조직 전체) |
| amount | number | Y | 월 예산 (USD) |
| alertThresholds | number[] | Y | 알림 기준 (e.g., [50, 80, 100] = 50%,80%,100%) |
| period | enum | Y | monthly / weekly |
| isActive | boolean | Y | 활성 상태 |
| createdAt | datetime | Y | 생성일시 |

**Relationships**:
- N:1 → Organization
- N:1 → Project (optional)

### 3.9 Alert

**Description**: 시스템 알림 기록.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| orgId | string | Y | FK → Organization.id |
| type | enum | Y | budget_warning / budget_exceeded / anomaly / optimization |
| title | string | Y | 알림 제목 |
| message | string | Y | 알림 내용 |
| metadata | json | N | 추가 데이터 (예산ID, 사용률 등) |
| isRead | boolean | Y | 읽음 여부 |
| sentAt | datetime | Y | 발송 시각 |

### 3.10 OptimizationTip

**Description**: AI 기반 비용 최적화 제안.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| orgId | string | Y | FK → Organization.id |
| category | enum | Y | model_downgrade / batch_processing / caching / unused_key |
| suggestion | string | Y | 최적화 제안 내용 |
| potentialSaving | number | Y | 예상 절감액 (USD/월) |
| status | enum | Y | pending / applied / dismissed |
| createdAt | datetime | Y | 생성일시 |

---

## 4. Entity Relationships

```
┌──────────┐       1:N       ┌──────────────┐       1:N       ┌──────────┐
│   User   │───────────────→ │ Organization │───────────────→ │ Provider │
└──────────┘                 └──────────────┘                 └──────────┘
     │                              │                              │
     │ 1:N                          │ 1:N                          │ 1:N
     ▼                              ▼                              ▼
┌──────────┐                 ┌──────────┐                   ┌──────────┐
│  Member  │                 │ Project  │                   │  ApiKey  │
└──────────┘                 └──────────┘                   └──────────┘
                                   │                              │
                                   │ 1:N                          │ 1:N
                                   ▼                              ▼
                             ┌──────────┐                 ┌─────────────┐
                             │  Budget  │                 │ UsageRecord │
                             └──────────┘                 └─────────────┘

Organization 1:N → Alert
Organization 1:N → OptimizationTip
```

---

## 5. Type Definitions (TypeScript)

```typescript
// types/user.ts
export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  createdAt: Date
  updatedAt: Date
}

// types/organization.ts
export interface Organization {
  id: string
  name: string
  ownerId: string
  slug: string
  billingEmail?: string
  createdAt: Date
  updatedAt: Date
}

export type MemberRole = 'owner' | 'admin' | 'viewer'

export interface Member {
  id: string
  userId: string
  orgId: string
  role: MemberRole
  joinedAt: Date
}

// types/provider.ts
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'azure' | 'custom'

export interface Provider {
  id: string
  orgId: string
  type: ProviderType
  name: string
  isActive: boolean
  lastSyncAt?: Date
  createdAt: Date
}

export interface ApiKey {
  id: string
  providerId: string
  projectId?: string
  label: string
  encryptedKey: string
  keyPrefix: string
  isActive: boolean
  createdAt: Date
}

// types/project.ts
export interface Project {
  id: string
  orgId: string
  name: string
  description?: string
  color?: string
  createdAt: Date
}

// types/usage.ts
export interface UsageRecord {
  id: string
  apiKeyId: string
  orgId: string
  providerType: ProviderType
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  requestCount: number
  date: string // YYYY-MM-DD
  createdAt: Date
}

// types/budget.ts
export type BudgetPeriod = 'monthly' | 'weekly'

export interface Budget {
  id: string
  orgId: string
  projectId?: string
  amount: number
  alertThresholds: number[]
  period: BudgetPeriod
  isActive: boolean
  createdAt: Date
}

// types/alert.ts
export type AlertType = 'budget_warning' | 'budget_exceeded' | 'anomaly' | 'optimization'

export interface Alert {
  id: string
  orgId: string
  type: AlertType
  title: string
  message: string
  metadata?: Record<string, unknown>
  isRead: boolean
  sentAt: Date
}

// types/optimization.ts
export type OptimizationCategory = 'model_downgrade' | 'batch_processing' | 'caching' | 'unused_key'
export type OptimizationStatus = 'pending' | 'applied' | 'dismissed'

export interface OptimizationTip {
  id: string
  orgId: string
  category: OptimizationCategory
  suggestion: string
  potentialSaving: number
  status: OptimizationStatus
  createdAt: Date
}

// types/api.ts
export interface ApiResponse<T> {
  data: T
  meta?: {
    total?: number
    page?: number
    pageSize?: number
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
```

---

## 6. Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| VALIDATION_ERROR | 입력값 검증 실패 | 400 |
| UNAUTHORIZED | 인증 필요 | 401 |
| FORBIDDEN | 권한 없음 (role 부족) | 403 |
| NOT_FOUND | 리소스 없음 | 404 |
| CONFLICT | 중복 (slug, email 등) | 409 |
| RATE_LIMITED | API 호출 한도 초과 | 429 |
| PROVIDER_ERROR | LLM 프로바이더 API 오류 | 502 |
| INTERNAL_ERROR | 서버 내부 오류 | 500 |

---

## 7. LLM Model Pricing Reference (2026-02)

| Provider | Model | Input ($/1M tokens) | Output ($/1M tokens) |
|----------|-------|---------------------|----------------------|
| OpenAI | gpt-4o | $2.50 | $10.00 |
| OpenAI | gpt-4o-mini | $0.15 | $0.60 |
| Anthropic | claude-sonnet-4-5 | $3.00 | $15.00 |
| Anthropic | claude-haiku-4-5 | $0.80 | $4.00 |
| Google | gemini-2.0-flash | $0.10 | $0.40 |
| Google | gemini-2.0-pro | $1.25 | $5.00 |

> 가격은 변동 가능. 프로바이더 API에서 실시간 조회 또는 정기 업데이트.

---

## Validation Checklist

- [x] 모든 주요 용어 정의됨 (12개)
- [x] 핵심 Entity 정의됨 (10개)
- [x] Entity 관계 명확함
- [x] TypeScript 타입 정의됨
- [x] Error codes 정의됨
- [x] LLM 모델 가격 참조 포함

---

*Generated by bkit PDCA System*
