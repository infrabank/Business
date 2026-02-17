# Design: reports-export

> 비용 리포트 & 데이터 내보내기 - 동적 리포트 생성, 멀티 포맷(CSV/JSON/PDF), 기간별 분석, 월간 이메일 리포트

## 1. Architecture Overview

```
Reports Page (UI)
  ├── 월별 리포트 카드 목록 ← /api/reports/monthly
  ├── 리포트 상세 분석    ← /api/reports/summary
  └── 내보내기 (다운로드)  ← /api/reports/export?format=csv|json|pdf
                             │
                             ├── CSV: BOM UTF-8, 프로바이더/모델/프로젝트 컬럼
                             ├── JSON: 구조화된 summary + breakdown + records
                             └── PDF: report-pdf.service → HTML → PDF

/api/cron/monthly-report (월간 이메일)
  └── notification-email.service → Growth 사용자에게 월간 요약 발송
```

### 핵심 설계 원칙
- **기존 패턴 재사용**: dashboard/summary API의 집계 로직 패턴 동일 적용
- **Plan 게이팅**: `isFeatureAvailable(plan, 'export')` + `checkHistoryLimit(plan)` 조합
- **하위 호환**: 기존 `/api/reports/export` CSV 형식은 그대로 유지, format 파라미터로 확장
- **PDF는 경량**: Vercel Serverless 환경에서 puppeteer 불가 → HTML 문자열 기반 PDF (jspdf + jspdf-autotable)

## 2. Type Definitions

### 2.1 `src/types/report.ts` (신규)

```typescript
import type { ProviderType } from './provider'

export type ReportFormat = 'csv' | 'json' | 'pdf'
export type ReportPeriodPreset = 'this-month' | 'last-month' | '7d' | '30d' | '90d' | 'custom'

export interface MonthlyReport {
  month: string          // "2026-02"
  label: string          // "2026년 2월"
  totalCost: number
  totalTokens: number
  totalRequests: number
  providerCount: number
  modelCount: number
  isCurrentMonth: boolean
}

export interface ReportSummary {
  period: { from: string; to: string }
  overview: {
    totalCost: number
    totalTokens: number
    totalRequests: number
    dailyAverage: number
    previousPeriodCost: number
    changePercent: number
  }
  byProvider: {
    type: ProviderType
    cost: number
    tokenCount: number
    requestCount: number
    percentage: number
  }[]
  byModel: {
    model: string
    provider: ProviderType
    cost: number
    tokenCount: number
    requestCount: number
  }[]
  byProject: {
    projectId: string
    name: string
    cost: number
    percentage: number
  }[]
  dailyTrend: {
    date: string
    cost: number
    tokens: number
    requests: number
  }[]
}

export interface ExportOptions {
  orgId: string
  format: ReportFormat
  from: string
  to: string
}
```

### 2.2 `src/types/index.ts` 수정

```typescript
// 기존 export에 추가
export type {
  ReportFormat,
  ReportPeriodPreset,
  MonthlyReport,
  ReportSummary,
  ExportOptions,
} from './report'
```

## 3. Service Layer

### 3.1 `src/services/report.service.ts` (신규)

```typescript
import { bkend } from '@/lib/bkend'
import type { UsageRecord, Project } from '@/types'
import type { MonthlyReport, ReportSummary } from '@/types/report'

// ---- Monthly Report List ----
export async function getMonthlyReports(
  orgId: string,
  token: string,
  maxMonths: number,  // Free=1, Growth=12
): Promise<MonthlyReport[]> {
  // 1. bkend.get<UsageRecord[]>('/usage-records', { orgId })
  // 2. Group by month (YYYY-MM)
  // 3. For each month: totalCost, totalTokens, totalRequests, unique providers, unique models
  // 4. Sort desc by month
  // 5. Slice to maxMonths
  // 6. Current month → isCurrentMonth: true
}

// ---- Report Summary (breakdown analysis) ----
export async function getReportSummary(
  orgId: string,
  from: string,
  to: string,
  token: string,
): Promise<ReportSummary> {
  // 1. Fetch records: bkend.get<UsageRecord[]> with date_gte/date_lte
  // 2. Fetch previous period (same length) for comparison
  // 3. Fetch projects: bkend.get<Project[]>
  // 4. Aggregate:
  //    - overview: totals + dailyAverage + changePercent
  //    - byProvider: group by providerType, calc percentage
  //    - byModel: group by model, sort by cost desc, top 10
  //    - byProject: match projectId to project name
  //    - dailyTrend: group by date
}

// ---- CSV Export ----
export function generateCsv(records: UsageRecord[]): string {
  // BOM + header + rows
  // Columns: Date, Provider, Model, Project, Input Tokens, Output Tokens, Total Tokens, Cost, Requests
  // BOM: '\uFEFF' prefix for Excel Korean support
}

// ---- JSON Export ----
export function generateJson(
  summary: ReportSummary,
  records: UsageRecord[],
): string {
  // { summary, records }
  // JSON.stringify with 2-space indent
}

// ---- PDF Export ----
export async function generatePdf(
  summary: ReportSummary,
  orgName: string,
): Promise<Buffer> {
  // jsPDF + jspdf-autotable
  // Page 1: Title + Overview table
  // Page 2: By Provider table + By Model table
  // Page 3: By Project table + Daily trend table (last 10 days)
  // Header: "LLM Cost Manager - 비용 리포트"
  // Footer: 생성일시, 페이지 번호
}
```

### 3.2 `src/services/report-pdf.service.ts` (신규)

```typescript
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import type { ReportSummary } from '@/types/report'

export async function buildPdfReport(
  summary: ReportSummary,
  orgName: string,
): Promise<Buffer> {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(18)
  doc.text('LLM Cost Manager - 비용 리포트', 14, 22)
  doc.setFontSize(10)
  doc.text(`기간: ${summary.period.from} ~ ${summary.period.to}`, 14, 30)
  doc.text(`조직: ${orgName}`, 14, 36)

  // Overview table
  doc.autoTable({
    startY: 44,
    head: [['항목', '값']],
    body: [
      ['총 비용', `$${summary.overview.totalCost.toFixed(2)}`],
      ['총 토큰', summary.overview.totalTokens.toLocaleString()],
      ['총 요청', summary.overview.totalRequests.toLocaleString()],
      ['일 평균', `$${summary.overview.dailyAverage.toFixed(2)}`],
      ['전기 대비', `${summary.overview.changePercent >= 0 ? '+' : ''}${summary.overview.changePercent.toFixed(1)}%`],
    ],
  })

  // By Provider table
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [['프로바이더', '비용', '토큰', '요청', '비율']],
    body: summary.byProvider.map(p => [
      p.type, `$${p.cost.toFixed(2)}`, p.tokenCount.toLocaleString(),
      p.requestCount.toLocaleString(), `${p.percentage.toFixed(1)}%`,
    ]),
  })

  // By Model table (Top 10)
  doc.addPage()
  doc.autoTable({
    startY: 20,
    head: [['모델', '프로바이더', '비용', '토큰', '요청']],
    body: summary.byModel.slice(0, 10).map(m => [
      m.model, m.provider, `$${m.cost.toFixed(2)}`,
      m.tokenCount.toLocaleString(), m.requestCount.toLocaleString(),
    ]),
  })

  // By Project table
  if (summary.byProject.length > 0) {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['프로젝트', '비용', '비율']],
      body: summary.byProject.map(p => [
        p.name, `$${p.cost.toFixed(2)}`, `${p.percentage.toFixed(1)}%`,
      ]),
    })
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(`생성: ${new Date().toISOString().split('T')[0]} | 페이지 ${i}/${pageCount}`, 14, 285)
  }

  return Buffer.from(doc.output('arraybuffer'))
}
```

## 4. API Routes

### 4.1 `src/app/api/reports/monthly/route.ts` (신규)

```typescript
// GET /api/reports/monthly?orgId=xxx
//   - getMeServer() → auth
//   - Get user plan → maxMonths (free=1, growth=12)
//   - getMonthlyReports(orgId, token, maxMonths)
//   - Return MonthlyReport[]
```

### 4.2 `src/app/api/reports/summary/route.ts` (신규)

```typescript
// GET /api/reports/summary?orgId=xxx&from=2026-01-01&to=2026-01-31
//   - getMeServer() → auth
//   - Get user plan → checkHistoryLimit for date range validation
//   - Growth only: isFeatureAvailable(plan, 'export') for full analysis
//   - Free: returns overview only (no breakdown)
//   - getReportSummary(orgId, from, to, token)
//   - Return ReportSummary
```

### 4.3 `src/app/api/reports/export/route.ts` (수정)

```typescript
// GET /api/reports/export?orgId=xxx&format=csv&from=2026-01-01&to=2026-01-31
//   - getMeServer() → auth
//   - Get user plan
//   - Free: format=csv만, checkHistoryLimit(7일)
//   - Growth: csv/json/pdf, checkHistoryLimit(365일)
//   - format=csv → generateCsv(records) → text/csv response
//   - format=json → generateJson(summary, records) → application/json response
//   - format=pdf → generatePdf(summary, orgName) → application/pdf response
//   - Content-Disposition: attachment; filename="report-{from}-{to}.{ext}"
//
// 하위 호환: period 파라미터도 지원 (from/to로 변환)
```

### 4.4 `src/app/api/cron/monthly-report/route.ts` (신규)

```typescript
// GET /api/cron/monthly-report?secret=CRON_SECRET
//   - CRON_SECRET 인증
//   - Growth 사용자 목록 조회
//   - 각 사용자의 전월 ReportSummary 생성
//   - notification-email.service의 sendEmail 활용
//   - 월간 리포트 HTML 생성 (buildMonthlyReportHtml)
//   - 이메일 채널의 recipients에게 발송
//   - 결과: { ok, sent, skipped, failed }
```

## 5. UI Components

### 5.1 `src/features/reports/hooks/useReports.ts` (신규)

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { MonthlyReport, ReportSummary, ReportFormat } from '@/types/report'

export function useReports(orgId?: string | null) {
  // monthlyReports: MonthlyReport[]
  // summary: ReportSummary | null
  // isLoading: boolean
  // selectedPeriod: { from: string; to: string }
  // setSelectedPeriod(from, to)
  // fetchSummary(from, to): GET /api/reports/summary
  // exportReport(format, from, to): GET /api/reports/export → blob download
  // refetch()
}
```

### 5.2 `src/features/reports/components/MonthlyReportList.tsx` (신규)

```
┌─────────────────────────────────────────────────────┐
│ 월별 리포트                                          │
├─────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│ │ 2026년 2월   │ │ 2026년 1월   │ │ 2025년 12월  │   │
│ │ (진행 중)    │ │              │ │              │   │
│ │ $2,847.53   │ │ $3,215.82   │ │ $2,960.14   │   │
│ │ 1.2M tokens │ │ 1.5M tokens │ │ 1.3M tokens │   │
│ │ 4,521 req   │ │ 5,108 req   │ │ 4,832 req   │   │
│ │ 3 providers │ │ 3 providers │ │ 2 providers │   │
│ │ [상세보기]   │ │ [상세보기]   │ │ [상세보기]   │   │
│ └─────────────┘ └─────────────┘ └─────────────┘    │
│                                                     │
│ ⚡ Free 플랜: 이번 달만 조회 가능                    │
│    Growth로 업그레이드하면 12개월 [업그레이드]         │
└─────────────────────────────────────────────────────┘
```

**구현 세부:**
- `'use client'` 컴포넌트
- `useReports(orgId)` hook의 monthlyReports 사용
- 카드 클릭 → `onSelectMonth(month)` callback → 부모에서 summary 로드
- Free 플랜: 1개 카드만 표시 + 업그레이드 유도

### 5.3 `src/features/reports/components/ReportDetail.tsx` (신규)

```
┌─────────────────────────────────────────────────────┐
│ 2026년 1월 리포트                    [CSV] [JSON] [PDF]│
├─────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │ 총 비용 │ │ 총 토큰 │ │ 총 요청 │ │ 일 평균 │        │
│ │$3,215  │ │ 1.5M   │ │ 5,108  │ │ $103.7 │        │
│ │ +8.6%  │ │ +12%   │ │ +5.7%  │ │        │        │
│ └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                     │
│ 프로바이더별 비용                                    │
│ ┌───────────────────────────────────────────┐       │
│ │ OpenAI     ████████████████  $1,820 (57%) │       │
│ │ Anthropic  ████████         $1,050 (33%) │       │
│ │ Google     ███              $345  (10%) │       │
│ └───────────────────────────────────────────┘       │
│                                                     │
│ 모델별 Top 5                                        │
│ ┌───────────────────────────────────────────┐       │
│ │ # │ 모델          │ 비용    │ 토큰    │ 요청 │       │
│ │ 1 │ gpt-4o        │ $1,200 │ 580K   │ 2.1K│       │
│ │ 2 │ claude-3.5    │ $850   │ 420K   │ 1.5K│       │
│ │ 3 │ gemini-pro    │ $345   │ 210K   │ 890 │       │
│ └───────────────────────────────────────────┘       │
│                                                     │
│ 프로젝트별 비용                                     │
│ ┌───────────────────────────────────────────┐       │
│ │ 프로젝트A  ████████████  $1,500 (47%)      │       │
│ │ 프로젝트B  ████████      $1,000 (31%)      │       │
│ │ 기타       ███████       $715  (22%)      │       │
│ └───────────────────────────────────────────┘       │
│                                                     │
│ ⚡ Free 플랜: 상세 분석은 Growth 전용                │
└─────────────────────────────────────────────────────┘
```

**구현 세부:**
- `'use client'` 컴포넌트
- `summary: ReportSummary` prop으로 데이터 수신
- 내보내기 버튼: CSV/JSON/PDF 드롭다운 또는 개별 버튼
- Free 플랜: overview 카드만 표시, breakdown은 블러 + 업그레이드 유도
- 프로바이더별 비용: 수평 바 차트 (Recharts BarChart)
- 모델별 Top 5: DataTable 컴포넌트 활용
- 프로젝트별: 수평 바 차트

### 5.4 `src/features/reports/components/PeriodSelector.tsx` (신규)

```
┌─────────────────────────────────────────────────────┐
│ 기간 선택                                            │
│ [이번 달] [지난 달] [7일] [30일] [90일] [커스텀]      │
│                                                     │
│ (커스텀 선택 시)                                      │
│ 시작: [2026-01-01]  종료: [2026-01-31]  [적용]       │
└─────────────────────────────────────────────────────┘
```

**구현 세부:**
- 프리셋 버튼 그룹 (active state 표시)
- 커스텀: 두 개 date input (from/to)
- Free: 7일 프리셋만 활성, 나머지 disabled + "Growth" 배지
- `onPeriodChange(from, to)` callback

### 5.5 `src/app/(dashboard)/reports/page.tsx` (전면 수정)

```typescript
'use client'
// 기존 하드코딩 데이터 전면 제거
// 구조:
// 1. useReports(orgId) hook
// 2. PeriodSelector → 기간 변경 시 fetchSummary
// 3. MonthlyReportList → 월별 카드 클릭 시 해당 월 summary 로드
// 4. ReportDetail → summary 표시 + 내보내기 버튼
// 5. 플랜 게이팅: user plan 전달
```

## 6. Vercel Cron 수정

### 6.1 `vercel.json` 수정

```json
{
  "crons": [
    { "path": "/api/sync/schedule", "schedule": "0 3 * * *" },
    { "path": "/api/cron/report-usage", "schedule": "0 0 1 * *" },
    { "path": "/api/cron/detect-anomalies", "schedule": "0 * * * *" },
    { "path": "/api/cron/send-digest", "schedule": "0 0 * * *" },
    { "path": "/api/cron/monthly-report", "schedule": "0 1 1 * *" }
  ]
}
```

매월 1일 01:00 UTC에 실행 (report-usage 후 1시간 뒤)

## 7. Dependencies

### 7.1 새 패키지

```bash
npm install jspdf jspdf-autotable
npm install -D @types/jspdf
```

- **jspdf**: 순수 JS PDF 생성 (Vercel Serverless 호환)
- **jspdf-autotable**: jsPDF 테이블 플러그인

## 8. Plan Limits 활용

기존 `isFeatureAvailable(plan, 'export')` + `checkHistoryLimit(plan)` 조합:

| 항목 | Free | Growth |
|------|------|--------|
| 내보내기 포맷 | CSV만 | CSV + JSON + PDF |
| 조회 기간 | 7일 | 365일 |
| 월별 리포트 | 현재 월 1개 | 최근 12개월 |
| 상세 분석 (breakdown) | 불가 (overview만) | 전체 |
| 월간 이메일 리포트 | 불가 | 발송 |
| 프리셋 | 7일만 | 전체 |

## 9. Security Considerations

| 항목 | 대응 |
|------|------|
| 데이터 접근 제어 | getMeServer() + orgId 소유권 확인 |
| 대량 데이터 | maxDays 제한 (Free=7, Growth=365) |
| PDF 생성 timeout | 10초 제한, 에러 시 graceful fallback |
| CSV injection | 셀 값에 `=`, `+`, `-`, `@` prefix 시 `'` 이스케이프 |
| 파일명 sanitize | orgId는 UUID, 날짜는 YYYY-MM-DD → 안전 |

## 10. Implementation Order

```
Phase 1: Data Layer
  1. src/types/report.ts (타입 정의)
  2. src/types/index.ts (export 추가)
  3. src/services/report.service.ts (집계 + CSV/JSON 생성)
  4. src/services/report-pdf.service.ts (PDF 생성)

Phase 2: APIs
  5. src/app/api/reports/monthly/route.ts (월별 목록)
  6. src/app/api/reports/summary/route.ts (상세 분석)
  7. src/app/api/reports/export/route.ts (수정: 멀티 포맷)

Phase 3: Cron
  8. src/app/api/cron/monthly-report/route.ts (월간 이메일)
  9. vercel.json (cron 추가)

Phase 4: UI
  10. src/features/reports/hooks/useReports.ts
  11. src/features/reports/components/PeriodSelector.tsx
  12. src/features/reports/components/MonthlyReportList.tsx
  13. src/features/reports/components/ReportDetail.tsx
  14. src/app/(dashboard)/reports/page.tsx (전면 수정)
```

## 11. File Summary

### New Files (10)
| # | File | LOC est. |
|---|------|----------|
| 1 | `src/types/report.ts` | ~60 |
| 2 | `src/services/report.service.ts` | ~200 |
| 3 | `src/services/report-pdf.service.ts` | ~120 |
| 4 | `src/app/api/reports/monthly/route.ts` | ~50 |
| 5 | `src/app/api/reports/summary/route.ts` | ~60 |
| 6 | `src/app/api/cron/monthly-report/route.ts` | ~80 |
| 7 | `src/features/reports/hooks/useReports.ts` | ~100 |
| 8 | `src/features/reports/components/PeriodSelector.tsx` | ~80 |
| 9 | `src/features/reports/components/MonthlyReportList.tsx` | ~120 |
| 10 | `src/features/reports/components/ReportDetail.tsx` | ~200 |

### Modified Files (4)
| # | File | Change |
|---|------|--------|
| 1 | `src/types/index.ts` | report 타입 export 추가 |
| 2 | `src/app/api/reports/export/route.ts` | 멀티 포맷 + 플랜 게이팅 |
| 3 | `src/app/(dashboard)/reports/page.tsx` | 전면 수정 (동적 데이터) |
| 4 | `vercel.json` | monthly-report cron 추가 |

**Total: 10 new + 4 modified = 14 files, ~1,070 LOC estimated**
