# Plan: Usage Analytics

> Feature: usage-analytics
> Created: 2026-02-17
> Status: **DRAFT**

## 1. Feature Overview

SaaS 플랫폼의 사용자 행동을 추적하고 분석하는 Growth 핵심 기능. 페이지 방문, 기능 사용, 세션, 퍼널 전환율을 자체 수집하여 대시보드로 시각화.

### 1.1 Background (현재 상태)

- **기존 분석**: LLM API 비용/사용량 분석만 존재 (dashboard-analytics, proxy-analytics)
- **문제점**: 사용자가 어떤 기능을 사용하는지, 어디서 이탈하는지 데이터 없음
- **외부 도구 없음**: Google Analytics, Mixpanel 등 미연동
- **Growth 블라인드 스팟**: 온보딩 완료율, 기능 채택률, 리텐션 데이터 부재
- **1인 운영**: 외부 유료 도구 대신 자체 경량 분석 시스템이 적합

### 1.2 Goal

- **이벤트 수집**: 클라이언트에서 페이지뷰, 클릭, 기능 사용 이벤트를 자동 수집
- **핵심 지표**: DAU/WAU/MAU, 기능별 사용률, 퍼널 전환율 시각화
- **리텐션 분석**: 주간/월간 리텐션 코호트 차트
- **자체 호스팅**: bkend.ai DB에 저장, 외부 의존성 없음
- **경량화**: 번들 크기 영향 최소 (< 3KB gzipped)

## 2. Functional Requirements

### FR-01: 이벤트 수집 클라이언트
- 전역 `AnalyticsProvider` 컴포넌트로 자동 페이지뷰 추적
- `useAnalytics()` 훅으로 커스텀 이벤트 수집
- 이벤트 배치 전송 (5초 또는 10개 누적 시)
- 오프라인 큐 (navigator.sendBeacon fallback)

### FR-02: 이벤트 유형 정의
- `page_view`: 페이지 경로, 체류시간, referrer
- `feature_use`: 기능명 (provider_add, budget_set, alert_create, sync_trigger 등)
- `button_click`: 핵심 CTA 버튼 클릭 추적
- `onboarding_step`: 온보딩 단계별 진행/이탈
- `session_start` / `session_end`: 세션 시작/종료

### FR-03: 이벤트 수집 API
- `POST /api/analytics/events` — 배치 이벤트 수신
- 인증된 사용자만 수집 (비로그인 트래킹 제외)
- Rate limiting: 분당 100 이벤트
- 이벤트 유효성 검증 (type, timestamp 필수)

### FR-04: 분석 대시보드 페이지
- 새로운 `/analytics` 페이지 (관리자/owner 전용)
- 기간 선택기 (7d / 30d / 90d)
- 핵심 지표 카드: DAU, WAU, MAU, 평균 세션 시간
- 페이지별 방문 순위 차트 (Bar)
- 기능별 사용률 차트 (Bar)
- 일별 활성 사용자 추이 차트 (Line)

### FR-05: 퍼널 분석
- 정의된 퍼널: 회원가입 → 온보딩 완료 → 프로바이더 등록 → 첫 동기화 → 7일 리텐션
- 단계별 전환율 (%) 시각화
- 퍼널 차트 (Funnel / Horizontal Bar)

### FR-06: 리텐션 코호트
- 주간 코호트: 가입 주 기준 N주 후 재방문율
- 히트맵 스타일 코호트 테이블
- 코호트 기간: 최근 8주

### FR-07: 분석 API 엔드포인트
- `GET /api/analytics/summary` — 핵심 지표 (DAU/WAU/MAU, 세션)
- `GET /api/analytics/pages` — 페이지별 방문 순위
- `GET /api/analytics/features` — 기능별 사용률
- `GET /api/analytics/funnel` — 퍼널 전환율
- `GET /api/analytics/retention` — 리텐션 코호트 데이터
- 모든 엔드포인트: owner/admin 권한 필수

### FR-08: 네비게이션 통합
- NAV_ITEMS에 '분석' 항목 추가 (BarChart3 아이콘)
- owner/admin 역할만 메뉴 표시

## 3. Non-Functional Requirements

| NFR | Description |
|-----|-------------|
| NFR-01 | 이벤트 수집이 UI 성능에 영향 없음 (비동기, 배치) |
| NFR-02 | 번들 크기 증가 < 3KB gzipped |
| NFR-03 | 이벤트 API 응답 < 100ms |
| NFR-04 | 최소 90일 이벤트 데이터 보관 |
| NFR-05 | GDPR 고려: 개인 식별 정보(PII) 미수집, userId만 사용 |

## 4. Technical Architecture

### 4.1 데이터 모델

```
analytics_events 테이블:
- id: string (PK)
- orgId: string (FK)
- userId: string (FK)
- type: string (page_view | feature_use | button_click | onboarding_step | session_start | session_end)
- name: string (페이지 경로 또는 기능명)
- metadata: JSON (체류시간, referrer, 추가 데이터)
- sessionId: string (브라우저 세션 ID)
- createdAt: datetime
```

### 4.2 신규 파일

| File | Purpose |
|------|---------|
| `src/features/analytics/components/AnalyticsDashboard.tsx` | 메인 분석 대시보드 |
| `src/features/analytics/components/MetricCards.tsx` | DAU/WAU/MAU 카드 |
| `src/features/analytics/components/PageRankChart.tsx` | 페이지별 방문 순위 |
| `src/features/analytics/components/FeatureUsageChart.tsx` | 기능별 사용률 |
| `src/features/analytics/components/ActiveUsersChart.tsx` | 일별 활성 사용자 추이 |
| `src/features/analytics/components/FunnelChart.tsx` | 퍼널 전환율 차트 |
| `src/features/analytics/components/RetentionCohort.tsx` | 리텐션 코호트 히트맵 |
| `src/features/analytics/hooks/useAnalytics.ts` | 이벤트 수집 훅 |
| `src/features/analytics/hooks/useAnalyticsDashboard.ts` | 대시보드 데이터 훅 |
| `src/features/analytics/providers/AnalyticsProvider.tsx` | 전역 이벤트 수집 provider |
| `src/app/api/analytics/events/route.ts` | POST: 이벤트 배치 수신 |
| `src/app/api/analytics/summary/route.ts` | GET: 핵심 지표 |
| `src/app/api/analytics/pages/route.ts` | GET: 페이지별 통계 |
| `src/app/api/analytics/features/route.ts` | GET: 기능별 통계 |
| `src/app/api/analytics/funnel/route.ts` | GET: 퍼널 데이터 |
| `src/app/api/analytics/retention/route.ts` | GET: 리텐션 코호트 |
| `src/app/(dashboard)/analytics/page.tsx` | 분석 페이지 라우트 |

### 4.3 수정 파일

| File | Changes |
|------|---------|
| `src/app/(dashboard)/layout.tsx` | AnalyticsProvider 래핑 |
| `src/lib/constants.ts` | NAV_ITEMS에 '분석' 추가 |
| `src/components/layout/NavBar.tsx` | owner/admin 권한 체크 |

### 4.4 기존 코드 재사용

| Component/Service | 재사용 방식 |
|-------------------|-------------|
| `Recharts` | 모든 차트 컴포넌트 |
| `PeriodSelector` | 기간 선택기 재사용 |
| `StatCard` | 지표 카드 재사용 |
| `bkend` | DB CRUD 및 집계 쿼리 |
| `getMeServer()` | API 인증 |

## 5. Implementation Order

| Phase | Files | Description |
|-------|-------|-------------|
| Phase 1 | 데이터 모델 + 이벤트 API | analytics_events 테이블, POST /api/analytics/events |
| Phase 2 | 클라이언트 수집 | AnalyticsProvider, useAnalytics 훅 |
| Phase 3 | 분석 API | summary, pages, features, funnel, retention 엔드포인트 |
| Phase 4 | 대시보드 UI | MetricCards, 차트 컴포넌트들 |
| Phase 5 | 통합 | 레이아웃 래핑, NAV 추가, 권한 체크 |

## 6. Out of Scope

- 실시간 사용자 모니터링 (WebSocket)
- A/B 테스트 프레임워크
- 외부 분석 도구 연동 (GA, Mixpanel)
- 비로그인 사용자 추적
- 이벤트 내보내기 (CSV/JSON)
- 커스텀 이벤트 정의 UI

## 7. Risk & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 이벤트 폭증으로 DB 부하 | Medium | High | 배치 전송 + Rate limiting + 90일 데이터 보관 |
| 번들 크기 증가 | Low | Medium | 이벤트 수집 코드 경량화, 대시보드 lazy load |
| bkend 집계 쿼리 성능 | Medium | Medium | 일별 pre-aggregation 고려 |
| 개인정보 이슈 | Low | High | userId만 수집, PII 미포함, 이벤트 데이터 최소화 |

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| 이벤트 수집률 | 로그인 사용자 100% 커버 |
| 분석 대시보드 로딩 | < 2초 |
| 이벤트 API 응답시간 | < 100ms |
| 번들 크기 영향 | < 3KB gzipped |
| 데이터 정확도 | 페이지뷰 ±5% 이내 |
