# bkend.ai 실제 연동 (bkend-integration) Planning Document

> **Summary**: Mock 데이터를 bkend.ai 실제 백엔드(인증, DB CRUD, RLS)로 교체하여 서비스를 실동작 상태로 전환
>
> **Project**: LLM Cost Manager
> **Version**: 0.1.0
> **Author**: Solo Founder
> **Date**: 2026-02-15
> **Status**: Draft
> **Previous Feature**: [business-setup (archived)](../../archive/2026-02/business-setup/)

---

## 1. Overview

### 1.1 Purpose

현재 MVP는 모든 데이터를 mock으로 처리하고 있다. 이 기능은 bkend.ai BaaS를 실제로 연동하여:
- 실제 회원가입/로그인 동작
- DB 테이블 생성 및 CRUD 연동
- API 라우트에서 실제 데이터 반환
- 인증 미들웨어로 보호된 페이지/API

를 구현하여 **실사용 가능한 서비스**로 전환한다.

### 1.2 Background

- business-setup MVP 완성 (98.5% match rate)
- 15개 파일에서 mock 데이터 사용 중
- bkend.ai HTTP 클라이언트(`lib/bkend.ts`)와 auth 헬퍼(`lib/auth.ts`) 이미 존재
- 10개 Entity 스키마 정의 완료 (`docs/01-plan/schema.md`)
- 6개 API 라우트 구현됨 (mock 응답 반환 중)

### 1.3 Related Documents

- Schema: [schema.md](../schema.md)
- Archived Design: [business-setup.design.md](../../archive/2026-02/business-setup/business-setup.design.md)
- bkend.ai Docs: bkend-quickstart, bkend-auth, bkend-data skills 참조

---

## 2. Scope

### 2.1 In Scope

- [x] bkend.ai 프로젝트 생성 및 환경변수 설정 가이드
- [x] 10개 Entity에 대한 bkend.ai 테이블 생성 스크립트/가이드
- [x] 인증 플로우 실제 연동 (signup, login, logout, session refresh)
- [x] Next.js Middleware로 인증 보호 (dashboard 라우트 그룹)
- [x] 6개 feature hook에서 mock 데이터 → bkend.ai CRUD 교체
- [x] 6개 API 라우트에서 mock 응답 → 실제 DB 쿼리 교체
- [x] Dashboard 페이지에서 직접 mock import 제거
- [x] RLS(Row Level Security) 정책 가이드

### 2.2 Out of Scope

- LLM 프로바이더 실제 API 호출 (real-time-sync 피쳐에서 처리)
- 이메일 발송 (SMTP 연동은 별도 피쳐)
- Vercel 배포 (deploy-production 피쳐에서 처리)
- 테스트 코드 작성 (testing-suite 피쳐에서 처리)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | bkend.ai 프로젝트 설정 가이드 문서 제공 | High | Pending |
| FR-02 | 실제 회원가입 → 로그인 → 토큰 발급 동작 | High | Pending |
| FR-03 | JWT 기반 인증 미들웨어 (dashboard 보호) | High | Pending |
| FR-04 | Organization CRUD (생성, 조회, 수정) | High | Pending |
| FR-05 | Provider + ApiKey CRUD (암호화 포함) | High | Pending |
| FR-06 | UsageRecord 조회 (필터링, 정렬, 페이지네이션) | High | Pending |
| FR-07 | Budget CRUD + 임계값 알림 연동 | Medium | Pending |
| FR-08 | Alert 조회 + 읽음 처리 | Medium | Pending |
| FR-09 | Project CRUD | Medium | Pending |
| FR-10 | OptimizationTip CRUD | Low | Pending |
| FR-11 | Dashboard summary/chart API에서 실제 DB 집계 | High | Pending |
| FR-12 | mock-data.ts 의존성 완전 제거 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Latency | API 응답 < 500ms | bkend.ai 직접 측정 |
| Security | 인증 없이 dashboard 접근 불가 | Middleware 검증 |
| Reliability | 인증 토큰 만료 시 자동 갱신 | refresh token 흐름 |
| DX | 로컬 개발 시 .env.local만으로 동작 | 환경변수 검증 |

---

## 4. Implementation Strategy

### 4.1 Integration Layers

```
Layer 1: Infrastructure (bkend.ai 설정)
  └─ 프로젝트 생성, 테이블 생성, 환경변수

Layer 2: Authentication (인증 연동)
  └─ signup/login 실제 동작, middleware, session

Layer 3: Data Layer (CRUD 연동)
  └─ hooks에서 bkend.ai REST API 호출

Layer 4: API Routes (서버 로직 연동)
  └─ summary/chart/export에서 실제 DB 쿼리

Layer 5: Cleanup (mock 제거)
  └─ mock-data.ts 의존성 제거, fallback 정리
```

### 4.2 File Change Matrix

| File | Current State | Target State | Change Type |
|------|--------------|-------------|-------------|
| `lib/bkend.ts` | HTTP 클라이언트 존재 | 유지 (minor 수정) | Modify |
| `lib/auth.ts` | API 함수 존재, cookie 관리 | 실제 동작 확인 + 에러 핸들링 강화 | Modify |
| `middleware.ts` | 없음 | 인증 미들웨어 신규 생성 | **New** |
| `features/auth/hooks/useAuth.ts` | mock fallback | 실제 bkend.ai 호출 | Modify |
| `features/auth/components/LoginForm.tsx` | UI만 존재 | 실제 로그인 연동 | Modify |
| `features/auth/components/SignupForm.tsx` | UI만 존재 | 실제 회원가입 연동 | Modify |
| `features/dashboard/hooks/useDashboard.ts` | mock 데이터 | bkend.ai API 호출 | Modify |
| `features/providers/hooks/useProviders.ts` | mock 데이터 | bkend.ai CRUD | Modify |
| `features/budget/hooks/useBudgets.ts` | mock 데이터 | bkend.ai CRUD | Modify |
| `features/alerts/hooks/useAlerts.ts` | mock 데이터 | bkend.ai CRUD | Modify |
| `features/optimization/hooks/useOptimization.ts` | mock 데이터 | bkend.ai CRUD | Modify |
| `app/api/sync/trigger/route.ts` | 존재 | 실제 DB 연동 | Modify |
| `app/api/dashboard/summary/route.ts` | mock 응답 | 실제 DB 집계 | Modify |
| `app/api/dashboard/chart/route.ts` | mock 응답 | 실제 시계열 데이터 | Modify |
| `app/api/reports/export/route.ts` | mock CSV | 실제 데이터 CSV | Modify |
| `app/api/optimization/tips/route.ts` | mock 응답 | 실제 DB 조회 | Modify |
| `app/api/providers/validate/route.ts` | 존재 | 유지 (이미 adapter 사용) | No Change |
| `app/(dashboard)/dashboard/page.tsx` | mock import | hook 사용 | Modify |
| `app/(dashboard)/providers/page.tsx` | mock import | hook 사용 | Modify |
| `app/(dashboard)/budget/page.tsx` | mock import | hook 사용 | Modify |
| `app/(dashboard)/alerts/page.tsx` | mock import | hook 사용 | Modify |
| `app/(dashboard)/projects/page.tsx` | mock import | hook 사용 | Modify |
| `app/(dashboard)/providers/[id]/page.tsx` | mock import | hook 사용 | Modify |
| `lib/mock-data.ts` | mock 생성기 | 삭제 또는 dev-only 전환 | Delete/Modify |

### 4.3 Implementation Order

1. **Phase 1: bkend.ai 프로젝트 설정** (인프라)
   - bkend.ai 계정/프로젝트 생성 가이드
   - 10개 테이블 생성 (MCP 또는 REST API)
   - `.env.local` 설정

2. **Phase 2: 인증 연동** (auth)
   - `middleware.ts` 생성 (인증 보호)
   - `useAuth` hook 실제 연동
   - LoginForm / SignupForm에 에러 핸들링
   - 토큰 갱신 로직

3. **Phase 3: Organization + Provider CRUD** (핵심 엔터티)
   - `useProviders` hook → bkend.ai CRUD
   - Provider + ApiKey 실제 생성/수정/삭제
   - 암호화 서비스 실제 연동

4. **Phase 4: Dashboard 데이터 연동** (비즈니스 로직)
   - `useDashboard` hook → API 라우트 호출
   - summary/chart API → 실제 DB 집계 쿼리
   - 대시보드 페이지에서 mock import 제거

5. **Phase 5: 부가 엔터티 CRUD** (나머지)
   - Budget, Alert, Project, OptimizationTip
   - 각 hook → bkend.ai CRUD
   - 각 페이지에서 mock import 제거

6. **Phase 6: Cleanup** (정리)
   - `mock-data.ts` 삭제 또는 `__dev__/` 이동
   - 모든 mock fallback 제거
   - 전체 빌드 검증

---

## 5. bkend.ai Table Mapping

> Schema: [schema.md](../schema.md) 참조

### 5.1 Table Creation Order (의존성 기반)

```
1. users              (독립)
2. organizations      (FK: users)
3. members            (FK: users, organizations)
4. projects           (FK: organizations)
5. providers          (FK: organizations)
6. api_keys           (FK: providers, projects)
7. usage_records      (FK: api_keys, organizations)
8. budgets            (FK: organizations, projects)
9. alerts             (FK: organizations)
10. optimization_tips (FK: organizations)
```

### 5.2 Column Type Mapping

| TypeScript Type | bkend.ai Column Type |
|----------------|---------------------|
| `string` (UUID) | `uuid` (auto-generated) |
| `string` | `text` |
| `number` | `number` |
| `boolean` | `boolean` |
| `enum` | `text` + validation |
| `Date` | `datetime` |
| `json` | `json` |
| `number[]` | `json` (array) |

---

## 6. Auth Flow Detail

### 6.1 Signup Flow

```
User → SignupForm → useAuth.signup()
  → lib/auth.ts signup() → POST /auth/signup (bkend.ai)
  → Receive { accessToken, refreshToken }
  → setAuthCookies()
  → Create Organization (auto)
  → Redirect → /dashboard
```

### 6.2 Login Flow

```
User → LoginForm → useAuth.login()
  → lib/auth.ts login() → POST /auth/login (bkend.ai)
  → Receive { accessToken, refreshToken }
  → setAuthCookies()
  → Redirect → /dashboard
```

### 6.3 Middleware Protection

```
Request → middleware.ts
  → Check access_token cookie
  → If missing → redirect /login
  → If expired → try refresh
  → If refresh fails → redirect /login
  → If valid → continue to page
```

### 6.4 Protected Routes

| Route Pattern | Protection |
|--------------|-----------|
| `/(dashboard)/*` | Auth required |
| `/api/*` (except validate) | Bearer token required |
| `/(auth)/*` | Public (redirect if logged in) |
| `/`, `/pricing` | Public |

---

## 7. Success Criteria

### 7.1 Definition of Done

- [ ] bkend.ai 프로젝트에 10개 테이블 생성
- [ ] 실제 회원가입 → 로그인 → 대시보드 접근 동작
- [ ] 미인증 사용자 dashboard 접근 시 /login 리다이렉트
- [ ] Provider 등록 → API 키 저장 (암호화) 동작
- [ ] Dashboard에서 실제 DB 데이터 표시
- [ ] mock-data.ts에 대한 직접 의존성 0개

### 7.2 Quality Criteria

- [ ] TypeScript strict 모드 에러 없음
- [ ] 빌드 성공 (next build)
- [ ] 인증 토큰 만료 시 자동 갱신
- [ ] 네트워크 에러 시 사용자 친화적 에러 표시

---

## 8. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| bkend.ai API 스키마 불일치 | High | Medium | 스키마 문서 기반으로 테이블 먼저 검증 |
| 인증 토큰 관리 복잡성 | Medium | Medium | httpOnly cookie + middleware로 단순화 |
| CORS 이슈 | Medium | High | bkend.ai CORS 설정 + Next.js proxy |
| 대량 mock 코드 교체 실수 | Medium | Medium | 기능별로 단계적 교체, 빌드 검증 |
| bkend.ai rate limit | Low | Low | 요청 큐잉, 캐싱 전략 |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (상세 API 연동 스펙)
2. [ ] bkend.ai 프로젝트 생성
3. [ ] Phase 1~6 순서대로 구현
4. [ ] Gap Analysis

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-15 | Initial draft - bkend.ai integration plan | Solo Founder |
