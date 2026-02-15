# Dashboard Analytics (dashboard-analytics) Plan Document

> **Feature**: Dashboard Analytics - 실시간 분석 & 인사이트 대시보드
>
> **Project**: LLM Cost Manager
> **Author**: Solo Founder
> **Date**: 2026-02-15
> **Status**: Draft
> **Level**: Dynamic

---

## 1. Feature Overview

### 1.1 Problem Statement

현재 대시보드는 기본 통계(총비용, 토큰, 요청수)와 단순 차트(일별 비용 추이, 프로바이더 파이, 모델 바)만 제공합니다. 사용자가 비용 최적화 의사결정을 하기 위해 필요한 핵심 기능이 부족합니다:

- **기간 선택 불가**: 7일/30일/90일 전환이 UI에 없음 (코드상 `period` prop은 존재하나 UI 미구현)
- **비교 분석 불가**: 이전 기간 대비 트렌드를 시각적으로 비교할 수 없음
- **프로바이더 필터 없음**: 특정 프로바이더만 필터링하여 분석할 수 없음
- **최적화 팁 미연동**: Optimization Tips 섹션이 "Tips will appear here" placeholder 상태
- **프로젝트별 분석 없음**: `byProject` 데이터가 빈 배열 `[]`로 반환됨
- **비용 예측 없음**: 월말 예상 비용을 알 수 없음

### 1.2 Proposed Solution

Dashboard를 **실시간 분석 & 인사이트 허브**로 강화:

1. Period Selector UI (7d/30d/90d 전환)
2. Cost Comparison 차트 (이전 기간 대비 오버레이)
3. Provider Filter 토글
4. Optimization Tips 실제 연동
5. Project Cost Breakdown 차트
6. Cost Forecast (선형 추세 기반 월말 예측)

### 1.3 Value Proposition

- **즉각적 인사이트**: 기간별 비교로 비용 증가/감소 트렌드 파악
- **세부 분석**: 프로바이더/프로젝트별 드릴다운
- **비용 절감**: 최적화 팁으로 실질적 절감 액션 유도
- **예측 가능성**: 월말 예상 비용으로 예산 초과 사전 방지

---

## 2. Functional Requirements

### FR-01: Period Selector

- Dashboard 상단에 7d / 30d / 90d 탭 UI 추가
- 선택 시 모든 차트와 통계가 해당 기간으로 갱신
- URL query param으로 기간 유지 (`?period=30d`)
- 기본값: 30d

### FR-02: Cost Trend Comparison

- CostTrendChart에 이전 기간 데이터 오버레이 (점선)
- 예: 30d 선택 시 → 최근 30일 (실선) + 이전 30일 (점선) 비교
- Tooltip에 현재/이전 값 동시 표시

### FR-03: Provider Filter

- Dashboard 차트 영역 위에 Provider 토글 버튼 그룹
- 프로바이더별 on/off로 차트 데이터 필터링
- 전체 선택/해제 토글 포함
- 필터 상태를 StatCard, CostTrendChart, ModelBarChart에 반영

### FR-04: Optimization Tips Integration

- Dashboard의 Optimization Tips 섹션에 실제 데이터 연동
- `useOptimization` 훅 활용하여 orgId 기반 팁 로드
- 각 팁에 Apply / Dismiss 버튼
- 예상 절감 금액 표시
- 팁 카테고리별 아이콘 (model-switch, prompt-optimization, caching, batch)

### FR-05: Project Cost Breakdown

- `byProject` 데이터를 실제로 계산하여 반환
- 수평 바 차트로 프로젝트별 비용 시각화
- 프로젝트가 없으면 "Assign costs to projects" CTA 표시

### FR-06: Cost Forecast

- 현재 기간 사용량 기반 월말 예상 비용 계산
- StatCard에 "Projected Cost" 추가
- 예산 대비 초과 예상 시 경고 표시
- 계산: (일평균 비용) × (해당 월 남은 일수) + (현재까지 비용)

### FR-07: Enhanced Chart API

- `/api/dashboard/chart` 엔드포인트에 comparison 데이터 추가
- Provider 필터 파라미터 지원 (`providerTypes` query param)
- 프로젝트별 비용 집계 추가

### FR-08: Dashboard Summary Enhancement

- `/api/dashboard/summary`에 forecast 데이터 추가
- `byProject` 실제 데이터 계산
- Optimization tips 요약 (총 절감 가능 금액)

---

## 3. Non-Functional Requirements

### NFR-01: Performance

- Dashboard 로딩 시간 < 2초 (모든 API 병렬 호출)
- 차트 렌더링 시 레이아웃 시프트 방지 (고정 높이)
- 기간 전환 시 스켈레톤 로딩 표시

### NFR-02: Responsiveness

- 모바일: 차트 세로 스택, StatCard 2열
- 태블릿: StatCard 2열, 차트 세로 스택
- 데스크톱: StatCard 4열 + 5열(forecast 추가), 차트 2열 그리드

### NFR-03: Accessibility

- 차트 색상 대비 WCAG 2.1 AA 준수
- 키보드로 Period Selector, Provider Filter 조작 가능

---

## 4. Technical Research

### 4.1 Recharts Capabilities

- **Multi-line chart**: `<Line>` 컴포넌트 2개로 현재/이전 비교 가능
- **Legend onClick**: 프로바이더 토글 필터 구현 가능
- **ComposedChart**: Area + Line 조합으로 현재(area) + 이전(line) 표시
- **ReferenceLine**: 예산 한도선 표시 가능

### 4.2 Existing Infrastructure

| Component | Status | Action |
|-----------|--------|--------|
| StatCard | ✅ Working | FR-06에서 Forecast 카드 추가 |
| CostTrendChart | ✅ Working | FR-02에서 비교 오버레이 추가 |
| ProviderPieChart | ✅ Working | FR-03에서 필터 연동 |
| ModelBarChart | ✅ Working | FR-03에서 필터 연동 |
| useDashboard | ✅ Working | FR-01/07에서 period/filter params 추가 |
| useOptimization | ✅ Working | FR-04에서 Dashboard 연동 |
| /api/dashboard/summary | ✅ Working | FR-05/06/08에서 확장 |
| /api/dashboard/chart | ✅ Working | FR-02/07에서 확장 |

### 4.3 Data Availability

- `usage_records`: orgId, providerType, model, date, cost 등 모든 필요 필드 있음
- `projects`: orgId로 조회 가능, usage_records에 projectId 연결 필요
- `optimization-tips`: orgId로 조회 가능, useOptimization 훅 완성됨
- `budgets`: 예산 데이터 활용하여 forecast 경고 가능

---

## 5. Implementation Phases

### Phase 1: Period Selector & API Enhancement (FR-01, FR-07)
- PeriodSelector 컴포넌트 생성
- useDashboard 훅에 period 상태 관리
- /api/dashboard/chart에 comparison 데이터 추가
- Dashboard 페이지에 PeriodSelector 통합

### Phase 2: Cost Comparison Chart (FR-02)
- CostTrendChart에 comparison 라인 추가 (이전 기간 점선)
- ChartDataPoint 타입에 previousCost 필드 추가
- Tooltip에 현재/이전 비교 표시

### Phase 3: Provider Filter (FR-03)
- ProviderFilter 토글 컴포넌트 생성
- useDashboard에 providerTypes 필터 파라미터
- /api/dashboard/chart, /api/dashboard/summary에 필터 반영
- 차트 + StatCard에 필터 적용

### Phase 4: Optimization Tips & Forecast (FR-04, FR-06, FR-08)
- Dashboard에 useOptimization 연동
- OptimizationTipCard 컴포넌트 생성
- /api/dashboard/summary에 forecast 계산 추가
- ForecastStatCard 또는 StatCard 확장

### Phase 5: Project Breakdown (FR-05)
- /api/dashboard/summary에서 byProject 실제 계산
- ProjectBreakdownChart 컴포넌트 생성 (수평 바)
- Dashboard 페이지에 통합

---

## 6. Data Model Changes

### 6.1 ChartDataPoint (수정)

```typescript
export interface ChartDataPoint {
  date: string
  cost: number
  tokens: number
  requests: number
  previousCost?: number  // NEW: 이전 기간 비용
}
```

### 6.2 DashboardSummary (수정)

```typescript
export interface DashboardSummary {
  totalCost: {
    current: number
    previous: number
    changePercent: number
  }
  forecast: {                // NEW
    projectedMonthly: number
    daysRemaining: number
    dailyAverage: number
    budgetWarning: boolean
  }
  byProvider: { ... }[]
  byProject: {               // POPULATE (currently empty)
    projectId: string
    name: string
    cost: number
    color: string
  }[]
  topModels: { ... }[]
  budgetStatus: BudgetStatus[]
  recentAlerts: Alert[]
  optimizationSummary: {     // NEW
    totalSavings: number
    tipsCount: number
    topTip?: string
  }
}
```

---

## 7. File Change Matrix

### New Files (3)

| # | File | Purpose |
|---|------|---------|
| 1 | `features/dashboard/components/PeriodSelector.tsx` | 기간 선택 탭 UI |
| 2 | `features/dashboard/components/ProviderFilter.tsx` | 프로바이더 필터 토글 |
| 3 | `features/dashboard/components/ProjectBreakdownChart.tsx` | 프로젝트별 비용 차트 |

### Modified Files (7)

| # | File | Changes |
|---|------|---------|
| 1 | `types/dashboard.ts` | ChartDataPoint.previousCost, DashboardSummary.forecast/optimizationSummary |
| 2 | `features/dashboard/hooks/useDashboard.ts` | period state, providerTypes filter param |
| 3 | `features/dashboard/components/CostTrendChart.tsx` | 비교 오버레이 (이전 기간 점선) |
| 4 | `app/api/dashboard/chart/route.ts` | comparison 데이터, providerTypes 필터 |
| 5 | `app/api/dashboard/summary/route.ts` | forecast, byProject, optimizationSummary |
| 6 | `app/(dashboard)/dashboard/page.tsx` | PeriodSelector, ProviderFilter, Tips, Forecast 통합 |
| 7 | `features/dashboard/components/StatCard.tsx` | forecast warning variant 추가 |

---

## 8. Risk Matrix

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| 차트 성능 저하 (대용량 데이터) | Medium | Low | 서버사이드 집계, 날짜 범위 제한 |
| Recharts 비교 차트 복잡성 | Low | Medium | ComposedChart로 Area+Line 조합 |
| 프로젝트 데이터 없음 (초기) | Low | High | CTA UI로 프로젝트 생성 유도 |
| 예측 정확도 낮음 | Low | Medium | "선형 추세 기반 추정치" 명시 |

---

## 9. Success Criteria

| Metric | Target |
|--------|--------|
| 기간 전환 응답 시간 | < 1초 |
| 모든 차트 렌더링 완료 | < 2초 |
| Build 오류 | 0건 |
| 새 컴포넌트 | 3개 |
| API 엔드포인트 수정 | 2개 |
| Gap Analysis Match Rate | >= 90% |
