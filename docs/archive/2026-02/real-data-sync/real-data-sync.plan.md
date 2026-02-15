# 실시간 프로바이더 데이터 동기화 (real-data-sync) Planning Document

> **Summary**: 프로바이더 어댑터의 mock 데이터 생성을 실제 API 호출로 교체하고, 자동/수동 동기화 + 이력 관리 + 에러 핸들링을 구현
>
> **Project**: LLM Cost Manager
> **Version**: 0.1.0
> **Author**: Solo Founder
> **Date**: 2026-02-15
> **Status**: Draft
> **Previous Feature**: [bkend-integration (archived)](../../archive/2026-02/bkend-integration/)

---

## 1. Overview

### 1.1 Purpose

현재 Provider Adapter들은 실제 API 호출이 실패하거나 미구현 시 `generateMockData()`로 랜덤 데이터를 반환한다.
이 기능은 각 프로바이더의 **실제 Usage API**를 호출하여 진짜 사용량/비용 데이터를 수집하고,
주기적 자동 동기화와 수동 동기화, 동기화 이력 관리를 구현한다.

핵심 가치: **Mock → Real** 전환으로 대시보드에 실제 비용 데이터 표시

### 1.2 Background

- bkend-integration 완료 (97% match rate) - DB CRUD 연동 완료
- Provider Adapter 패턴 이미 구현 (`base-adapter.ts` 인터페이스)
- OpenAI `fetchUsage()`: 실제 API 호출 시도 → 실패 시 mock fallback
- Anthropic/Google `fetchUsage()`: mock 데이터만 반환 (실제 API 미구현)
- `usage-sync.service.ts`: 동기화 로직 존재하지만 어댑터가 mock 반환
- `api/sync/trigger/route.ts`: 수동 동기화 트리거 API 존재

### 1.3 Current State Analysis

| Adapter | validateKey() | fetchUsage() | Status |
|---------|:------------:|:------------:|--------|
| OpenAI | Real API | Real → Mock fallback | Partial |
| Anthropic | Real API | Mock only | Mock |
| Google | Real API | Mock only | Mock |

### 1.4 Related Documents

- Schema: [schema.md](../schema.md)
- Archived: [bkend-integration](../../archive/2026-02/bkend-integration/)
- Provider Adapters: `app/src/services/providers/`

---

## 2. Scope

### 2.1 In Scope

- [x] OpenAI Usage API 실제 연동 개선 (에러 핸들링, 페이지네이션)
- [x] Anthropic Admin API 사용량 조회 연동
- [x] Google Cloud Billing / AI Platform 사용량 조회 연동
- [x] 동기화 상태 관리 (SyncHistory 엔터티)
- [x] 자동 동기화 스케줄러 (Cron Job via API Route)
- [x] 수동 동기화 UI (버튼 + 진행 상태)
- [x] 중복 데이터 방지 (upsert 전략)
- [x] 동기화 에러 핸들링 + 재시도 로직
- [x] Rate Limit 관리 (요청 큐잉)
- [x] 프로바이더별 가격 모델 최신화

### 2.2 Out of Scope

- 실시간 스트리밍 (WebSocket) - 향후 피쳐
- 자체 프록시를 통한 사용량 캡처 - 다른 접근 방식
- 이메일/Slack 알림 발송 - notification 피쳐에서 처리
- 멀티 리전 지원 - enterprise 피쳐

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | OpenAI Usage API v2 실제 호출 + 파싱 개선 | High | Pending |
| FR-02 | Anthropic Admin API 사용량 조회 구현 | High | Pending |
| FR-03 | Google AI Platform 사용량 조회 구현 | High | Pending |
| FR-04 | SyncHistory 엔터티 추가 (동기화 이력 추적) | High | Pending |
| FR-05 | 중복 데이터 방지 (date + model + apiKeyId 기준 upsert) | High | Pending |
| FR-06 | 수동 동기화 버튼 + 실시간 진행 상태 UI | High | Pending |
| FR-07 | 자동 동기화 스케줄러 (Vercel Cron / 외부 트리거) | Medium | Pending |
| FR-08 | Rate Limit 관리 (프로바이더별 요청 간격 제어) | Medium | Pending |
| FR-09 | 동기화 에러 시 재시도 (최대 3회, exponential backoff) | Medium | Pending |
| FR-10 | 프로바이더별 가격 테이블 DB 관리 (하드코딩 → DB) | Medium | Pending |
| FR-11 | Adapter에서 mock fallback 완전 제거 | Low | Pending |
| FR-12 | 동기화 로그/이력 조회 UI | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Reliability | 동기화 실패 시 기존 데이터 보존 | 트랜잭션 보장 |
| Performance | 단일 프로바이더 동기화 < 10초 (30일 기준) | API 응답 시간 |
| Rate Limit | OpenAI 60 req/min, Anthropic 60 req/min | 요청 큐 |
| Idempotency | 동일 기간 재동기화 시 중복 레코드 없음 | upsert 검증 |
| Observability | 동기화 성공/실패/건수 로깅 | SyncHistory 테이블 |

---

## 4. Provider API Research

### 4.1 OpenAI Usage API

**Endpoint**: `GET https://api.openai.com/v1/organization/usage/completions`

**Auth**: `Authorization: Bearer <admin-key>`

**Parameters**:
- `start_time` (unix timestamp, required)
- `end_time` (unix timestamp)
- `group_by` (model, project)
- `bucket_width` (1d, 1h)
- `limit`, `page` (pagination)

**Current Implementation**: `openai-adapter.ts:25-37` - 기본 호출 존재하지만 에러 시 mock fallback

**개선 필요사항**:
- Admin Key vs User Key 구분 (Organization Usage는 Admin Key 필요)
- 페이지네이션 처리 (대량 데이터)
- bucket_width=1d 기본값 설정
- 에러 코드별 처리 (401, 429, 500)

### 4.2 Anthropic Admin API

**Endpoint**: `GET https://api.anthropic.com/v1/organizations/{org_id}/usage`

**Auth**: `x-api-key: <admin-key>`, `anthropic-version: 2023-06-01`

**Notes**:
- Anthropic Admin API는 Organization-level 키 필요
- 일반 API 키로는 사용량 조회 불가
- 대안: Anthropic Console 웹 스크래핑은 TOS 위반 → API 공식 지원 대기
- **현실적 접근**: Admin API 키가 있으면 호출, 없으면 빈 배열 반환 + 안내 메시지

**구현 전략**:
```
1. Admin API 호출 시도
2. 401/403 → "Admin API 키가 필요합니다" 메시지 + 빈 결과
3. 성공 → UsageData[] 파싱
```

### 4.3 Google AI Platform Usage

**Endpoint**: Google Cloud Billing API / AI Platform API

**Auth**: Service Account JSON key 또는 API Key

**Notes**:
- Gemini API (generativelanguage) 자체에는 usage 조회 API 없음
- Google Cloud Billing Export 설정 필요 (BigQuery)
- **현실적 접근**: Google AI Studio의 사용량은 수동 입력 또는 CSV 임포트
- API 키 기반으로는 토큰 카운트만 가능 (response의 usageMetadata)

**구현 전략**:
```
1. Cloud Billing API 호출 시도 (service account 있을 경우)
2. 불가 → "Google은 사용량 수동 입력 또는 CSV 임포트를 권장합니다" 안내
3. 향후 usageMetadata 프록시 방식 지원
```

---

## 5. Data Model Changes

### 5.1 New Entity: SyncHistory

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| orgId | string | Y | FK → Organization.id |
| providerId | string | Y | FK → Provider.id |
| providerType | enum | Y | openai / anthropic / google |
| syncType | enum | Y | manual / scheduled / retry |
| status | enum | Y | running / success / failed / partial |
| fromDate | date | Y | 동기화 시작 날짜 |
| toDate | date | Y | 동기화 종료 날짜 |
| recordsCreated | number | Y | 생성된 레코드 수 |
| recordsUpdated | number | Y | 업데이트된 레코드 수 |
| errorMessage | string | N | 에러 메시지 |
| durationMs | number | Y | 소요 시간 (ms) |
| startedAt | datetime | Y | 시작 시각 |
| completedAt | datetime | N | 완료 시각 |

### 5.2 New Entity: ModelPricing

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Y | UUID |
| providerType | enum | Y | openai / anthropic / google |
| model | string | Y | 모델명 |
| inputPricePer1M | number | Y | 입력 토큰 1M당 가격 (USD) |
| outputPricePer1M | number | Y | 출력 토큰 1M당 가격 (USD) |
| effectiveFrom | date | Y | 적용 시작일 |
| effectiveTo | date | N | 적용 종료일 (null = 현재) |
| createdAt | datetime | Y | 생성일시 |

### 5.3 UsageRecord 변경

기존 필드 유지 + 추가:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| syncHistoryId | string | N | FK → SyncHistory.id (어떤 동기화에서 생성됐는지) |

---

## 6. Implementation Strategy

### 6.1 Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Scheduler   │────→│  Sync Service    │────→│  Provider    │
│  (Cron API)  │     │  (Orchestrator)  │     │  Adapters    │
└─────────────┘     └──────────────────┘     └──────────────┘
                            │                       │
                            │                       ▼
                            │                ┌──────────────┐
                            │                │  External    │
                            │                │  Provider    │
                            │                │  APIs        │
                            │                └──────────────┘
                            ▼
                    ┌──────────────┐
                    │  bkend.ai    │
                    │  (DB Store)  │
                    └──────────────┘
                    - UsageRecord (upsert)
                    - SyncHistory (log)
                    - ModelPricing (ref)
```

### 6.2 File Change Matrix

| File | Current State | Target State | Change Type |
|------|--------------|-------------|-------------|
| `services/providers/base-adapter.ts` | 기본 인터페이스 | + RateLimitConfig, SyncOptions 타입 추가 | Modify |
| `services/providers/openai-adapter.ts` | 실제 API + mock fallback | 실제 API only + 페이지네이션 + 에러 핸들링 | Modify |
| `services/providers/anthropic-adapter.ts` | mock only | Admin API 호출 + graceful fallback | Modify |
| `services/providers/google-adapter.ts` | mock only | Billing API 시도 + manual fallback 안내 | Modify |
| `services/usage-sync.service.ts` | 기본 동기화 | upsert + SyncHistory + retry + rate limit | Modify |
| `services/pricing.service.ts` | 없음 | ModelPricing CRUD + 가격 조회 | **New** |
| `services/sync-scheduler.service.ts` | 없음 | 자동 동기화 스케줄러 로직 | **New** |
| `app/api/sync/trigger/route.ts` | 수동 트리거 | + 상태 관리, SyncHistory 기록 | Modify |
| `app/api/sync/schedule/route.ts` | 없음 | Cron 호출용 API (Vercel Cron) | **New** |
| `app/api/sync/history/route.ts` | 없음 | 동기화 이력 조회 API | **New** |
| `types/sync.ts` | 없음 | SyncHistory, ModelPricing 타입 | **New** |
| `types/index.ts` | 기존 export | + sync 타입 export | Modify |
| `features/providers/hooks/useProviders.ts` | 기본 CRUD | + 동기화 트리거/상태 관리 | Modify |
| `features/providers/components/SyncButton.tsx` | 없음 | 수동 동기화 버튼 + 진행 상태 | **New** |
| `features/providers/components/SyncHistory.tsx` | 없음 | 동기화 이력 표시 컴포넌트 | **New** |
| `app/(dashboard)/providers/[id]/page.tsx` | 프로바이더 상세 | + SyncButton, SyncHistory 표시 | Modify |
| `lib/constants.ts` | 기존 상수 | + Rate Limit 설정, 동기화 설정 | Modify |

### 6.3 Implementation Order

1. **Phase 1: 타입 & 데이터 모델** (기반)
   - `types/sync.ts` 신규 생성
   - bkend.ai에 `sync_histories`, `model_pricings` 테이블 생성
   - `UsageRecord`에 `syncHistoryId` 필드 추가

2. **Phase 2: OpenAI 어댑터 개선** (핵심)
   - mock fallback 제거
   - 페이지네이션 처리
   - 에러 코드별 핸들링 (401, 429, 500)
   - Rate limit 관리

3. **Phase 3: Anthropic/Google 어댑터 구현** (확장)
   - Anthropic Admin API 호출 구현
   - Google Billing API 시도 + fallback
   - 각 어댑터의 mock 코드 제거

4. **Phase 4: 동기화 서비스 고도화** (통합)
   - upsert 전략 구현 (date + model + apiKeyId)
   - SyncHistory 기록
   - 재시도 로직 (exponential backoff)
   - Rate limit 큐

5. **Phase 5: 가격 서비스** (보조)
   - `pricing.service.ts` 생성
   - ModelPricing 테이블 초기 데이터 시딩
   - 어댑터에서 하드코딩 가격 → DB 조회로 전환

6. **Phase 6: UI & 스케줄러** (마무리)
   - SyncButton 컴포넌트 (수동 동기화)
   - SyncHistory 컴포넌트 (이력 표시)
   - 프로바이더 상세 페이지에 통합
   - Cron API Route 생성 (Vercel Cron 연동)

---

## 7. Sync Strategy Detail

### 7.1 Upsert Logic

```
Key: (orgId + apiKeyId + model + date)

1. 동기화 데이터 수신
2. 기존 레코드 조회 (key 기준)
3. 존재하면 → UPDATE (토큰, 비용, 요청수)
4. 없으면 → INSERT
5. SyncHistory에 created/updated 카운트 기록
```

### 7.2 Retry Strategy

```
1차 시도: 즉시
2차 시도: 2초 후
3차 시도: 8초 후
실패: SyncHistory에 status=failed + errorMessage 기록
```

### 7.3 Rate Limit Management

| Provider | Rate Limit | Strategy |
|----------|-----------|----------|
| OpenAI | 60 req/min (Tier 1) | 1초 간격 요청 |
| Anthropic | 60 req/min | 1초 간격 요청 |
| Google | 300 req/min | 0.5초 간격 요청 |

### 7.4 Sync Schedule

| Schedule | Description | Implementation |
|----------|-------------|----------------|
| 매일 03:00 UTC | 전일 데이터 동기화 | Vercel Cron → `/api/sync/schedule` |
| 수동 트리거 | 사용자 버튼 클릭 | UI → `/api/sync/trigger` |

---

## 8. Success Criteria

### 8.1 Definition of Done

- [ ] OpenAI: 실제 사용량 데이터 수집 성공 (Admin Key 사용)
- [ ] Anthropic: Admin API 호출 또는 graceful fallback
- [ ] Google: Billing API 호출 또는 안내 메시지
- [ ] 동일 기간 재동기화 시 중복 레코드 0건
- [ ] SyncHistory에 모든 동기화 이력 기록
- [ ] 수동 동기화 버튼으로 즉시 동기화 가능
- [ ] 동기화 실패 시 3회 재시도 후 에러 기록
- [ ] 어댑터에서 generateMockData() 제거

### 8.2 Quality Criteria

- [ ] TypeScript strict 모드 에러 없음
- [ ] 빌드 성공 (next build)
- [ ] Rate limit 초과 없음 (요청 간격 준수)
- [ ] 동기화 실패해도 기존 데이터 손실 없음

---

## 9. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Anthropic Admin API 접근 불가 | High | High | Graceful fallback + 사용자 안내 메시지 |
| Google Usage API 부재 | High | High | CSV 임포트 / 수동 입력 대안 제공 |
| OpenAI Admin Key 필요 (일반 키 불가) | Medium | Medium | 키 등록 시 Admin Key 여부 안내 |
| Rate Limit 초과로 일시 차단 | Medium | Medium | 요청 큐 + 간격 제어 |
| 대량 데이터 동기화 시 타임아웃 | Medium | Low | 기간 분할 동기화 (7일 단위) |
| 프로바이더 API 스키마 변경 | Low | Low | 어댑터 패턴으로 격리, 버전 관리 |

---

## 10. Next Steps

1. [ ] Design 문서 작성 (상세 API 스펙, 컴포넌트 설계)
2. [ ] bkend.ai에 sync_histories, model_pricings 테이블 생성
3. [ ] Phase 1~6 순서대로 구현
4. [ ] Gap Analysis

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-15 | Initial draft - real-data-sync plan | Solo Founder |
