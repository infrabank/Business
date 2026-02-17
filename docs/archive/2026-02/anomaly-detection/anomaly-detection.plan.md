# Plan: anomaly-detection

> 이상 지출 자동 감지 - 비정상적 비용 급증, 토큰 스파이크, 사용 패턴 이탈을 실시간 탐지하고 알림

## 1. Overview

### 1.1 Feature Summary
LLM Cost Manager의 핵심 차별화 기능으로, 조직의 LLM API 사용 패턴을 통계적으로 분석하여 비정상적인 비용 급증이나 토큰 사용량 스파이크를 자동 탐지한다. 탐지된 이상을 즉시 알림(Alert)으로 생성하여 사용자가 예상치 못한 과금을 사전에 방지할 수 있도록 한다.

### 1.2 Business Context
- **Why**: 고객의 #1 Pain Point = "GPT-4를 실수로 프로덕션에 배포해서 하루에 $3,000 과금" 같은 사고 방지
- **Impact**: Free → Growth 전환의 핵심 동기. "어제 $500 이상 지출 감지됨" 알림 = 직접적 금전 가치
- **Differentiation**: 경쟁사(Datadog, Langfuse)에 없는 AI 비용 특화 이상 감지
- **Priority**: High - `AlertType`에 `anomaly`가 이미 정의되어 있으나 실제 감지 로직 없음

### 1.3 Scope
- **In Scope**: 일별 비용 이상 감지, 시간별 스파이크 감지, 모델별 이상 사용량, 대시보드 위젯, 감지 설정 UI, Cron 기반 자동 실행
- **Out of Scope**: 외부 알림 채널(Slack/Email - 별도 PDCA), ML 기반 예측(v2), 실시간 스트리밍 감지

## 2. Requirements

### FR-01: 이상 감지 서비스
통계적 방법(Z-score, 이동 평균)으로 사용 패턴 이탈을 감지한다.
- 일별 비용 이상: 최근 14일 이동 평균 대비 Z-score > 2.0 (비용 급증)
- 시간별 스파이크: 직전 24시간 대비 시간당 비용이 3배 이상
- 모델별 이상: 특정 모델의 비용이 평소 대비 5배 이상 증가
- 미사용 모델 활성화: 7일 이상 미사용 모델이 갑자기 대량 사용 시작
- 감지 결과를 `anomaly` 타입의 Alert로 자동 생성

### FR-02: 이상 감지 Cron API
Vercel Cron으로 주기적 감지를 실행한다.
- `POST /api/cron/detect-anomalies` - 모든 활성 조직의 이상 감지 실행
- 기존 cron 패턴 활용 (`report-usage`, `reconcile-budgets`와 동일 구조)
- CRON_SECRET 인증
- 매 시간 실행 (Vercel cron schedule: `0 * * * *`)

### FR-03: 이상 감지 설정 API
조직별 감지 민감도를 설정한다.
- `GET /api/anomaly/settings` - 현재 감지 설정 조회
- `PATCH /api/anomaly/settings` - 감지 설정 업데이트
- 설정 항목: 감지 활성화(on/off), 민감도(low/medium/high), 일별/시간별 감지 토글, 알림 임계값
- Growth 플랜만 커스텀 설정 가능 (Free는 기본 설정만)

### FR-04: 대시보드 이상 감지 위젯
대시보드에 최근 이상 감지 요약을 표시한다.
- 최근 7일 이상 감지 건수 (stat card)
- 최근 이상 감지 알림 목록 (최대 3건)
- 이상 지점을 CostTrendChart에 마커로 표시 (빨간 점)
- "이상 감지 설정" 링크

### FR-05: 이상 감지 설정 UI
설정 페이지 또는 알림 페이지에서 감지 옵션을 관리한다.
- 감지 활성화/비활성화 토글
- 민감도 선택 (낮음/중간/높음 → Z-score 임계값 매핑)
- 일별 비용 감지 토글
- 시간별 스파이크 감지 토글
- 모델별 이상 감지 토글
- Growth 플랜 게이트 (Free → 업그레이드 유도)

### FR-06: 이상 감지 히스토리 API
과거 감지 기록을 조회한다.
- `GET /api/anomaly/history` - 이상 감지 이력 (최근 30일)
- 감지 유형, 심각도, 탐지 값, 기준 값, 날짜
- 알림 페이지에서 anomaly 타입 필터링 시 상세 정보 표시

### FR-07: 알림 페이지 anomaly 섹션 강화
기존 알림 페이지에 anomaly 전용 상세 정보를 추가한다.
- anomaly 알림 클릭 시 상세 패널: 감지된 값 vs 기준값, 그래프
- 심각도 표시 (warning/critical)
- "이 패턴 무시" 버튼 (해당 패턴의 향후 감지 억제)

### FR-08: 이상 감지 통계 집계
감지 서비스가 사용할 통계 집계 함수를 구현한다.
- `getUsageStats(orgId, days)` - 기간별 일별 비용 통계 (평균, 표준편차, 최대, 최소)
- `getHourlyUsage(orgId, hours)` - 시간별 비용 데이터
- `getModelUsageHistory(orgId, model, days)` - 모델별 사용 이력
- bkend.ai의 usage-records 컬렉션에서 집계

## 3. Data Model

### 3.1 Existing Types (변경 없음)
```typescript
// types/alert.ts - 이미 'anomaly' 타입 포함
type AlertType = 'budget_warning' | 'budget_exceeded' | 'anomaly' | 'optimization'
interface Alert { id, orgId, type, title, message, metadata?, isRead, sentAt }

// types/usage.ts - 이미 존재
interface UsageRecord { id, apiKeyId, orgId, providerType, model, inputTokens, outputTokens, totalTokens, cost, requestCount, projectId?, date, createdAt }
```

### 3.2 New Type: AnomalyDetectionSettings
```typescript
interface AnomalyDetectionSettings {
  id: string
  orgId: string
  enabled: boolean
  sensitivity: 'low' | 'medium' | 'high'  // Z-score: 3.0 / 2.0 / 1.5
  dailyCostDetection: boolean
  hourlySpkeDetection: boolean
  modelAnomalyDetection: boolean
  suppressedPatterns: string[]  // 무시할 패턴 ID 목록
  createdAt: string
  updatedAt: string
}
```

### 3.3 New Type: AnomalyEvent
```typescript
interface AnomalyEvent {
  id: string
  orgId: string
  alertId?: string  // 연결된 Alert ID
  type: 'daily_cost_spike' | 'hourly_spike' | 'model_anomaly' | 'dormant_model_activation'
  severity: 'warning' | 'critical'
  detectedValue: number    // 감지된 실제 값
  baselineValue: number    // 기준값 (이동 평균)
  threshold: number        // 사용된 임계값
  zScore: number           // 계산된 Z-score
  model?: string           // 모델별 이상 시 해당 모델
  detectedAt: string
  metadata?: Record<string, unknown>
}
```

### 3.4 Sensitivity Mapping
```typescript
const SENSITIVITY_THRESHOLDS = {
  low: { zScore: 3.0, hourlyMultiplier: 5, modelMultiplier: 10 },
  medium: { zScore: 2.0, hourlyMultiplier: 3, modelMultiplier: 5 },
  high: { zScore: 1.5, hourlyMultiplier: 2, modelMultiplier: 3 },
}
```

### 3.5 bkend.ai Collections
- `anomaly-settings` - 조직별 감지 설정 (새로 생성)
- `anomaly-events` - 감지 이력 (새로 생성)
- `alerts` - 기존 알림 (anomaly 타입 활용)
- `usage-records` - 기존 사용 기록 (집계용)

## 4. API Design

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | /api/cron/detect-anomalies | CRON_SECRET | system | 전체 조직 이상 감지 실행 |
| GET | /api/anomaly/settings | Required | any | 감지 설정 조회 |
| PATCH | /api/anomaly/settings | Required | admin+ | 감지 설정 업데이트 |
| GET | /api/anomaly/history | Required | any | 감지 이력 조회 (최근 30일) |
| POST | /api/anomaly/suppress | Required | admin+ | 특정 패턴 무시 설정 |

## 5. Implementation Files

### 5.1 New Files (예상 12개)
| File | Purpose |
|------|---------|
| `src/services/anomaly.service.ts` | 이상 감지 핵심 로직 (통계 분석, Z-score 계산) |
| `src/services/anomaly-stats.service.ts` | 사용량 통계 집계 함수 |
| `src/types/anomaly.ts` | AnomalyDetectionSettings, AnomalyEvent 타입 |
| `src/app/api/cron/detect-anomalies/route.ts` | Cron 이상 감지 실행 |
| `src/app/api/anomaly/settings/route.ts` | GET/PATCH 감지 설정 |
| `src/app/api/anomaly/history/route.ts` | GET 감지 이력 |
| `src/app/api/anomaly/suppress/route.ts` | POST 패턴 무시 |
| `src/features/anomaly/components/AnomalySettingsPanel.tsx` | 감지 설정 UI |
| `src/features/anomaly/components/AnomalyHistoryList.tsx` | 감지 이력 목록 |
| `src/features/anomaly/components/AnomalyDetailPanel.tsx` | 알림 상세 패널 |
| `src/features/anomaly/hooks/useAnomalySettings.ts` | 설정 hook |
| `src/features/anomaly/hooks/useAnomalyHistory.ts` | 이력 hook |

### 5.2 Modified Files (예상 5개)
| File | Change |
|------|--------|
| `src/types/index.ts` | AnomalyDetectionSettings, AnomalyEvent export 추가 |
| `src/app/(dashboard)/dashboard/page.tsx` | 이상 감지 위젯 추가 |
| `src/app/(dashboard)/alerts/page.tsx` | anomaly 상세 패널 통합 |
| `src/features/dashboard/components/CostTrendChart.tsx` | 이상 지점 마커 추가 |
| `vercel.json` | cron schedule 추가 (`0 * * * *`) |

## 6. Implementation Order

```
Phase 1: Data Layer (FR-08, FR-01)
  → AnomalyDetectionSettings, AnomalyEvent 타입 정의
  → anomaly-stats.service.ts (통계 집계 함수)
  → anomaly.service.ts (감지 로직: Z-score, 스파이크, 모델 이상)

Phase 2: Cron + APIs (FR-02, FR-03, FR-06)
  → POST /api/cron/detect-anomalies
  → GET/PATCH /api/anomaly/settings
  → GET /api/anomaly/history
  → POST /api/anomaly/suppress

Phase 3: Dashboard Integration (FR-04)
  → 대시보드 이상 감지 stat card
  → CostTrendChart에 anomaly 마커
  → 최근 anomaly 알림 표시

Phase 4: Settings + Alert UI (FR-05, FR-07)
  → AnomalySettingsPanel (감지 설정 UI)
  → AnomalyHistoryList (이력 목록)
  → AnomalyDetailPanel (알림 상세)
  → alerts 페이지 anomaly 섹션 강화
```

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 데이터 부족 (초기 사용자는 14일 이력이 없음) | Medium | 최소 3일 데이터 필요, 미달 시 감지 비활성 + 안내 표시 |
| 오탐 (False Positive) 과다 | High | 민감도 3단계 제공, "무시" 기능, 최초 medium 기본값 |
| bkend.ai 집계 쿼리 성능 | Medium | 일별 집계를 캐싱, 시간별은 최근 48시간만 조회 |
| Cron 실행 타임아웃 (Vercel 60초 제한) | Medium | 조직별 병렬 처리, 10개씩 배치, 타임아웃 시 다음 실행에 이어서 |
| 사용자 혼란 (알림 과다) | Medium | 동일 패턴 24시간 내 중복 알림 방지, 최대 5건/일 제한 |

## 8. Success Criteria

- [ ] 일별 비용 이상 (Z-score 기반)이 자동 감지된다
- [ ] 시간별 스파이크가 3배 이상 증가 시 감지된다
- [ ] 모델별 이상 사용이 감지된다
- [ ] 감지 결과가 anomaly Alert로 자동 생성된다
- [ ] 대시보드에 이상 감지 요약이 표시된다
- [ ] CostTrendChart에 이상 지점이 마커로 표시된다
- [ ] 감지 민감도를 설정할 수 있다 (low/medium/high)
- [ ] 특정 패턴을 "무시"할 수 있다
- [ ] Cron이 매 시간 자동 실행된다
- [ ] tsc 에러 0개, 프로덕션 빌드 성공

## 9. Estimation

- **New Files**: ~12개
- **Modified Files**: ~5개
- **Total LOC**: ~1,400 lines (estimated)
- **Complexity**: Medium-High (통계 분석 + Cron + UI 위젯)
