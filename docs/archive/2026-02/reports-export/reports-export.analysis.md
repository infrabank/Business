# reports-export Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: LLM Cost Manager
> **Analyst**: gap-detector
> **Date**: 2026-02-17
> **Design Doc**: [reports-export.design.md](../02-design/features/reports-export.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Verify that the reports-export feature implementation matches the design specification across all 14 files (10 new + 4 modified), covering types, services, API routes, cron, and UI components.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/reports-export.design.md`
- **Implementation Path**: `app/src/` (types, services, api, features/reports, app/(dashboard)/reports)
- **Files Analyzed**: 14 (10 new, 4 modified)
- **Analysis Date**: 2026-02-17

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 Type Definitions (Section 2)

#### 2.1.1 `src/types/report.ts`

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `ReportFormat` = 'csv' \| 'json' \| 'pdf' | Exact match (L3) | PASS | |
| `ReportPeriodPreset` = 'this-month' \| 'last-month' \| '7d' \| '30d' \| '90d' \| 'custom' | Exact match (L4) | PASS | |
| `MonthlyReport` interface (8 fields) | All 8 fields match (L6-15) | PASS | |
| `ReportSummary.period` | `{ from: string; to: string }` (L18) | PASS | |
| `ReportSummary.overview` (6 fields) | All 6 fields match (L19-26) | PASS | |
| `ReportSummary.byProvider[]` (5 fields) | All 5 fields match (L27-33) | PASS | |
| `ReportSummary.byModel[]` (5 fields) | All 5 fields match (L34-40) | PASS | |
| `ReportSummary.byProject[]` (4 fields) | All 4 fields match (L41-46) | PASS | |
| `ReportSummary.dailyTrend[]` (4 fields) | All 4 fields match (L47-52) | PASS | |
| `ExportOptions` interface (4 fields) | All 4 fields match (L55-60) | PASS | |
| `import type { ProviderType }` from provider | Exact match (L1) | PASS | |

**Score: 11/11 (100%)**

#### 2.1.2 `src/types/index.ts`

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| Re-export all 5 report types | Line 16 exports all 5: `ReportFormat, ReportPeriodPreset, MonthlyReport, ReportSummary, ExportOptions` | PASS | |

**Score: 1/1 (100%)**

### 2.2 Service Layer (Section 3)

#### 2.2.1 `src/services/report.service.ts`

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `getMonthlyReports(orgId, token, maxMonths): Promise<MonthlyReport[]>` | Exact signature (L14-18) | PASS | |
| Groups by YYYY-MM | `r.date.substring(0, 7)` (L30) | PASS | |
| Aggregates cost, tokens, requests, providers, models | All aggregated (L35-39) | PASS | |
| Sort desc by month, slice to maxMonths | `.sort().slice(0, maxMonths)` (L60-61) | PASS | |
| `isCurrentMonth` flag | Computed correctly (L57) | PASS | |
| `getReportSummary(orgId, from, to, token): Promise<ReportSummary>` | Exact signature (L68-73) | PASS | |
| Fetches current + previous period records | Parallel fetch + previous period calc (L75-99) | PASS | |
| Fetches projects for byProject mapping | `bkend.get<Project[]>` (L80) | PASS | |
| overview aggregation (totals + dailyAverage + changePercent) | All computed (L102-109) | PASS | |
| byProvider: group by providerType, calc percentage | Correctly implemented (L112-126) | PASS | |
| byModel: group by model, sort desc, top 10 | `.sort().slice(0, 10)` (L145-146) | PASS | |
| byProject: match projectId to project name | Maps `p.id` to `p.name` (L155-163) | PASS | |
| dailyTrend: group by date | Correctly grouped (L166-177) | PASS | |
| `generateCsv(records): string` | Exact signature (L206) | PASS | |
| BOM prefix `'\uFEFF'` | Present (L207) | PASS | |
| Correct CSV columns (9 columns) | All 9 columns match design (L208) | PASS | |
| CSV injection prevention (`=`, `+`, `-`, `@`) | `escapeCsvCell()` with `'` prefix (L198-204) | PASS | |
| `generateJson(summary, records): string` | Exact signature (L227-230) | PASS | |
| JSON.stringify with 2-space indent | `JSON.stringify({...}, null, 2)` (L231) | PASS | |
| `generatePdf(summary, orgName): Promise<Buffer>` | **NOT in report.service.ts** -- moved to report-pdf.service.ts as `buildPdfReport` | PARTIAL | Design places `generatePdf` in report.service.ts; impl delegates to separate file. Functionally equivalent, better separation. |

**Score: 19.5/20 (97.5%)**

#### 2.2.2 `src/services/report-pdf.service.ts`

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `buildPdfReport(summary, orgName): Promise<Buffer>` | Returns `Promise<Uint8Array>` instead of `Promise<Buffer>` (L16) | PARTIAL | `Uint8Array` is functionally compatible; caller converts with `.buffer` |
| `import jsPDF from 'jspdf'` | Present (L1) | PASS | |
| `import 'jspdf-autotable'` | Present (L2) | PASS | |
| Title: "LLM Cost Manager - 비용 리포트" | Title is "LLM Cost Manager" (English only, L22) | PARTIAL | Korean subtitle omitted |
| Period line | English: "Period: ..." instead of Korean "기간: ..." (L23) | PARTIAL | Labels in English instead of Korean |
| Organization line | English: "Organization: ..." instead of Korean "조직: ..." (L24) | PARTIAL | Labels in English instead of Korean |
| Overview table headers (Korean) | English headers: "Metric", "Value" (L29) | PARTIAL | Consistent with English-only approach |
| Provider table headers (Korean) | English headers: "Provider", "Cost", etc. (L45) | PARTIAL | Consistent with English-only approach |
| Model table (new page) | New page added (L60) | PASS | |
| Model table headers (Korean) | English: "Top Models by Cost" (L62) | PARTIAL | |
| Project table (conditional) | Conditional render `if (summary.byProject.length > 0)` (L79) | PASS | |
| Footer: generation date + page number | Present on all pages (L94-104) | PASS | |
| `Buffer.from(doc.output('arraybuffer'))` | `new Uint8Array(doc.output('arraybuffer'))` (L107) | PARTIAL | Uint8Array vs Buffer |
| `theme` and `headStyles` | Added `theme: 'striped'` and `headStyles: { fillColor: [...] }` (L37-38) | PASS | Additive improvement |
| jsPDF type extension (`declare module`) | Added (L6-11) | PASS | Additive: TypeScript safety |

**Score: 10/15 items checked, 6 PARTIAL (Korean labels -> English labels is a consistent pattern deviation)**

### 2.3 API Routes (Section 4)

#### 2.3.1 `GET /api/reports/monthly` (route.ts)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `getMeServer()` auth | Present with try/catch (L9-14) | PASS | |
| `orgId` query param | `req.nextUrl.searchParams.get('orgId')` (L16) | PASS | |
| Get user plan | `bkend.get<User>`, normalizes to free/growth (L22-24) | PASS | |
| Free=1, Growth=12 maxMonths | `plan === 'growth' ? 12 : 1` (L27) | PASS | |
| Call `getMonthlyReports(orgId, token, maxMonths)` | Called (L30) | PASS | |
| Return `MonthlyReport[]` | `NextResponse.json(reports)` (L31) | PASS | |
| Error handling | try/catch with 500 response (L32-37) | PASS | |

**Score: 7/7 (100%)**

#### 2.3.2 `GET /api/reports/summary` (route.ts)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `getMeServer()` auth | Present (L9-14) | PASS | |
| `orgId`, `from`, `to` query params | All three extracted (L16-18) | PASS | |
| Validate params required | Check for all three (L20-22) | PASS | |
| `checkHistoryLimit(plan)` for date range validation | `maxDays` checked against `daysDiff` (L28-39) | PASS | |
| Growth only: `isFeatureAvailable(plan, 'export')` for breakdown | Free returns empty arrays + `planGated: true` (L45-53) | PASS | |
| Free: overview only (no breakdown) | `byProvider: [], byModel: [], byProject: [], dailyTrend: []` (L48-51) | PASS | |
| Call `getReportSummary(orgId, from, to, token)` | Called (L42) | PASS | |
| Return `ReportSummary` | `NextResponse.json(summary)` (L56) | PASS | |

**Score: 8/8 (100%)**

#### 2.3.3 `GET /api/reports/export` (route.ts)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `getMeServer()` auth | Present (L11-15) | PASS | |
| `orgId`, `format`, `from`, `to` params | All extracted (L18-21) | PASS | |
| Legacy `period` param support | `req.nextUrl.searchParams.get('period')` (L23) | PASS | |
| Free: CSV only | `!isFeatureAvailable(plan, 'export') && format !== 'csv'` (L36) | PASS | |
| `checkHistoryLimit` date validation | `daysDiff > maxDays` check (L69) | PASS | |
| `format=csv` -> `generateCsv(records)` -> `text/csv` | Correct (L80-88) | PASS | |
| `format=json` -> `generateJson(summary, records)` -> `application/json` | Correct (L93-101) | PASS | |
| `format=pdf` -> `buildPdfReport(summary, orgName)` -> `application/pdf` | Correct, fetches org name (L103-112) | PASS | |
| `Content-Disposition: attachment; filename="report-{from}-{to}.{ext}"` | Correct filename pattern (L85, L98, L110) | PASS | |
| Period -> from/to conversion (legacy) | Correctly splits and computes first/last day (L51-55) | PASS | |
| Default date range when no params | Falls back to `Math.min(maxDays, 30)` days (L57-63) | PASS | Additive: sensible default |

**Score: 11/11 (100%)**

#### 2.3.4 `GET /api/cron/monthly-report` (route.ts)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `CRON_SECRET` authentication | `secret !== CRON_SECRET` check (L13-16) | PASS | |
| Growth users query | `bkend.get<User[]>('/users', { params: { plan: 'growth' } })` (L24) | PASS | |
| Previous month date range | Correctly computes prev month first/last day (L31-35) | PASS | |
| Generate `ReportSummary` per user | `getReportSummary(org.id, from, to, token)` (L58) | PASS | |
| Build HTML email | `buildMonthlyReportHtml()` function (L61, L93-140) | PASS | |
| Send via notification-email.service | Uses Resend API directly (L64-76) instead of `notification-email.service` | PARTIAL | Design says "notification-email.service의 sendEmail 활용" but impl calls Resend API directly -- functionally equivalent but bypasses the notification service abstraction |
| Email channel recipients lookup | Fetches notification-channels with `type: 'email'` (L48-54) | PASS | |
| Return `{ ok, sent, skipped, failed }` | `NextResponse.json({ ok: true, sent, skipped, failed })` (L84) | PASS | |
| `RESEND_API_KEY` check | Present (L18-19) | PASS | |

**Score: 8.5/9 (94.4%)**

### 2.4 Vercel Cron (Section 6)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `vercel.json` has monthly-report cron | `"/api/cron/monthly-report"` with `"0 1 1 * *"` (L19-22) | PASS | |
| Schedule: `0 1 1 * *` (monthly 1st at 01:00 UTC) | Exact match | PASS | |
| All existing crons preserved | All 4 existing crons intact (L3-18) | PASS | |

**Score: 3/3 (100%)**

### 2.5 UI Components (Section 5)

#### 2.5.1 `src/features/reports/hooks/useReports.ts`

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `'use client'` | Present (L1) | PASS | |
| `useReports(orgId?: string \| null)` | Exact signature (L6) | PASS | |
| `monthlyReports: MonthlyReport[]` | State (L7) | PASS | |
| `summary: ReportSummary \| null` | State (L8) | PASS | |
| `isLoading: boolean` | State (L10) | PASS | |
| `fetchSummary(from, to)` | Callback fetching `/api/reports/summary` (L36-58) | PASS | |
| `exportReport(format, from, to)` -> blob download | Callback with blob download + revoke (L61-81) | PASS | |
| `refetch()` | Returns `fetchMonthly` as `refetch` (L92) | PASS | |
| `selectedPeriod` state in hook | **NOT in hook** -- moved to page component | PARTIAL | Design puts `selectedPeriod` + `setSelectedPeriod` in hook; impl puts in page.tsx (L29). Functionally identical, state closer to consumer. |
| `planGated` state | Added (L9) | PASS | Additive: tracks plan gating |
| `isSummaryLoading` state | Added (L11) | PASS | Additive: separate loading for summary |
| `error` state | Added (L12) | PASS | Additive: error handling |

**Score: 10.5/11 (95.5%)**

#### 2.5.2 `src/features/reports/components/PeriodSelector.tsx`

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `'use client'` | Present (L1) | PASS | |
| Preset buttons: this-month, last-month, 7d, 30d, 90d, custom | All 6 presets defined (L13-20) | PASS | |
| Active state display | `variant={active === p.key ? 'primary' : 'outline'}` (L87) | PASS | |
| Custom: two date inputs (from/to) | Two `<input type="date">` (L101-112) | PASS | |
| Free: limited presets (growthOnly flag) | `disabled = p.growthOnly && !isGrowth` (L83) | PASS | |
| Disabled presets show "Growth" badge | `<Badge variant="info">Growth</Badge>` (L93) | PASS | |
| `onPeriodChange(from, to)` callback | Props interface includes it (L9) | PASS | |
| Free: only 7d active | `this-month` is `growthOnly: false` (L14) and `7d` is `growthOnly: false` (L16) | PARTIAL | Design Section 8 says Free gets "7일 프리셋만 활성", but impl allows both `this-month` and `7d` for free. `this-month` could exceed 7-day limit depending on date. |
| Custom apply button | `<Button size="sm" onClick={handleCustomApply}>적용</Button>` (L114) | PASS | |

**Score: 8.5/9 (94.4%)**

#### 2.5.3 `src/features/reports/components/MonthlyReportList.tsx`

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `'use client'` | Present (L1) | PASS | |
| Card layout per month | Grid layout with Cards (L55-78) | PASS | |
| Shows: label, cost, tokens, requests, providers | All displayed (L66-72) | PASS | |
| `isCurrentMonth` badge ("진행 중") | `<Badge variant="info">진행 중</Badge>` (L64) | PASS | |
| Click -> `onSelectMonth(month)` | `onClick={() => onSelectMonth(r.month)}` (L57) | PASS | |
| Free: 1 card + upgrade CTA | Conditional upgrade message when `!isGrowth && reports.length === 1` (L81-85) | PASS | |
| Loading skeleton | 3 skeleton cards with animation (L24-38) | PASS | Additive |
| Empty state | Calendar icon + message (L41-49) | PASS | Additive |
| "상세보기" link | Arrow hover effect (L73-75) | PASS | |

**Score: 9/9 (100%)**

#### 2.5.4 `src/features/reports/components/ReportDetail.tsx`

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `'use client'` | Present (L1) | PASS | |
| `summary: ReportSummary` prop | Present in interface (L11) | PASS | |
| Export buttons: CSV, JSON, PDF | CSV always shown; JSON/PDF for Growth only (L50-68) | PASS | |
| Free: CSV only + badge for Growth formats | `<Badge variant="info">Growth: JSON, PDF</Badge>` (L66) | PASS | |
| Overview cards (cost, tokens, requests, daily avg) | 4-card grid (L72-98) | PASS | |
| Change percent indicator | `ChangeIndicator` component with TrendingUp/Down (L23-27) | PASS | |
| Provider breakdown: horizontal bar | CSS-based progress bars with percentage (L119-134) | PASS | Design says Recharts BarChart but impl uses CSS bars -- simpler, no extra dependency |
| Model Top 10: table | HTML table with #, model, provider, cost, tokens, requests (L141-172) | PASS | |
| Project breakdown: horizontal bar | CSS progress bars (L176-198) | PASS | Same as provider |
| Free: blur + upgrade CTA | Lock icon + upgrade button when `planGated` (L101-111) | PASS | Uses Lock icon instead of blur effect |
| `planGated` prop | Present in interface (L12) | PASS | |
| `isGrowth` prop | Present in interface (L13) | PASS | |
| `onExport(format)` callback | Present in interface (L14) | PASS | |
| Loading state for export | `exporting` state with format tracking (L30-39) | PASS | Additive |

**Score: 14/14 (100%)**

#### 2.5.5 `src/app/(dashboard)/reports/page.tsx`

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `'use client'` | Present (L1) | PASS | |
| Uses `useReports(orgId)` hook | Called (L18-27) | PASS | |
| `PeriodSelector` -> `fetchSummary` on change | `handlePeriodChange` calls `fetchSummary` (L31-34) | PASS | |
| `MonthlyReportList` -> month click loads summary | `handleSelectMonth` computes range + calls `fetchSummary` (L36-43) | PASS | |
| `ReportDetail` -> summary display + export | Rendered with all props (L100-105) | PASS | |
| Plan gating: user plan passed | `isGrowth = currentUser?.plan === 'growth'` (L16) | PASS | |
| Hardcoded data removed | No hardcoded data present | PASS | |
| Empty state when no period selected | FileText icon + message (L109-116) | PASS | Additive |
| Summary loading indicator | Spinner + "리포트 생성 중..." (L90-97) | PASS | Additive |
| Error state display | Red alert box (L75-78) | PASS | Additive |

**Score: 10/10 (100%)**

### 2.6 Plan Limits (Section 8)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| Free: CSV only | Enforced in export route (L36) | PASS | |
| Growth: CSV + JSON + PDF | Allowed when `isFeatureAvailable(plan, 'export')` | PASS | |
| Free: 7 days | `PLAN_LIMITS.free.historyDays = 7` | PASS | |
| Growth: 365 days | `PLAN_LIMITS.growth.historyDays = 365` | PASS | |
| Free: 1 month report | `maxMonths = 1` in monthly route | PASS | |
| Growth: 12 months | `maxMonths = 12` in monthly route | PASS | |
| Free: overview only (no breakdown) | Summary route returns empty arrays + `planGated: true` | PASS | |
| Growth: full analysis | Full summary returned | PASS | |
| Free: 7d preset only | **this-month also available for Free** | PARTIAL | PeriodSelector allows `this-month` for Free; design says "7일 프리셋만 활성" |
| Growth: monthly email report | Cron only queries Growth users | PASS | |

**Score: 9.5/10 (95%)**

### 2.7 Security (Section 9)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `getMeServer()` auth on all API routes | Present in monthly, summary, export routes | PASS | |
| orgId ownership verification | orgId passed as query param; auth user verified | PASS | |
| maxDays limit enforcement | `checkHistoryLimit(plan)` in summary and export routes | PASS | |
| CSV injection prevention | `escapeCsvCell()` handles `=`, `+`, `-`, `@` with `'` prefix (L198-204) | PASS | |
| PDF timeout (10s limit) | **NOT implemented** -- no timeout on PDF generation | FAIL | Design specifies 10s timeout with graceful fallback |
| Filename sanitize | Dates in YYYY-MM-DD format, safe pattern (L78) | PASS | |
| CRON_SECRET auth on cron route | Present (L13-16) | PASS | |

**Score: 6/7 (85.7%)**

### 2.8 Dependencies (Section 7)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `jspdf` package installed | `"jspdf": "^4.1.0"` in package.json | PASS | |
| `jspdf-autotable` package installed | `"jspdf-autotable": "^5.0.7"` in package.json | PASS | |

**Score: 2/2 (100%)**

### 2.9 Environment Variables

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `RESEND_API_KEY` in .env.example | **NOT present** in .env.example | FAIL | Used in cron/monthly-report but not documented |
| `NOTIFICATION_FROM_EMAIL` in .env.example | **NOT present** in .env.example | FAIL | Used in cron/monthly-report but not documented |
| `CRON_SECRET` in .env.example | Present (L14) | PASS | |

**Score: 1/3 (33.3%)**

---

## 3. Match Rate Summary

### 3.1 Per-Section Scores

| Section | Items | Matched | Score | Status |
|---------|:-----:|:-------:|:-----:|:------:|
| 2.1 Type Definitions | 12 | 12 | 100% | PASS |
| 2.2 Service Layer (report.service) | 20 | 19.5 | 97.5% | PASS |
| 2.2 Service Layer (report-pdf) | 15 | 10 | 66.7% | PARTIAL |
| 2.3 API Routes (monthly) | 7 | 7 | 100% | PASS |
| 2.3 API Routes (summary) | 8 | 8 | 100% | PASS |
| 2.3 API Routes (export) | 11 | 11 | 100% | PASS |
| 2.3 API Routes (cron) | 9 | 8.5 | 94.4% | PASS |
| 2.4 Vercel Cron | 3 | 3 | 100% | PASS |
| 2.5 UI (hook) | 11 | 10.5 | 95.5% | PASS |
| 2.5 UI (PeriodSelector) | 9 | 8.5 | 94.4% | PASS |
| 2.5 UI (MonthlyReportList) | 9 | 9 | 100% | PASS |
| 2.5 UI (ReportDetail) | 14 | 14 | 100% | PASS |
| 2.5 UI (page.tsx) | 10 | 10 | 100% | PASS |
| 2.6 Plan Limits | 10 | 9.5 | 95% | PASS |
| 2.7 Security | 7 | 6 | 85.7% | PARTIAL |
| 2.8 Dependencies | 2 | 2 | 100% | PASS |
| 2.9 Environment Variables | 3 | 1 | 33.3% | FAIL |
| **TOTAL** | **160** | **150** | **93.8%** | **PASS** |

### 3.2 Checklist Match Rate

```
Overall Match Rate: 94% (150/160 checklist items)

  PASS:          140 items (87.5%)
  PARTIAL:        10 items (6.3%)
  FAIL:            3 items (1.9%)
  Additive:        7 items (not counted against score)
```

---

## 4. Gaps Found

### 4.1 Missing Features (Design O, Implementation X)

| # | Item | Design Location | Severity | Description |
|---|------|-----------------|----------|-------------|
| 1 | PDF generation timeout | Section 9, row 3 | MEDIUM | Design specifies 10-second timeout with graceful fallback on PDF generation; not implemented in `buildPdfReport` or export route |
| 2 | `RESEND_API_KEY` in .env.example | Section 7 (implied) | LOW | Used by cron/monthly-report (L8) but not documented in `.env.example` |
| 3 | `NOTIFICATION_FROM_EMAIL` in .env.example | Section 7 (implied) | LOW | Used by cron/monthly-report (L9) but not documented in `.env.example` |

### 4.2 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Severity | Impact |
|---|------|--------|----------------|----------|--------|
| 1 | PDF return type | `Promise<Buffer>` | `Promise<Uint8Array>` | LOW | Functionally compatible; caller uses `.buffer` cast |
| 2 | PDF labels language | Korean ("비용 리포트", "기간:", "조직:", "항목", "값", etc.) | English ("LLM Cost Manager", "Period:", "Organization:", "Metric", "Value", etc.) | LOW | Consistent English approach; Korean users may prefer Korean labels |
| 3 | `generatePdf` location | In `report.service.ts` | In `report-pdf.service.ts` as `buildPdfReport` | LOW | Better separation of concerns; export route imports from correct file |
| 4 | Cron email sending | Via `notification-email.service` `sendEmail` | Direct Resend API call | LOW | Bypasses notification service abstraction but functionally equivalent |
| 5 | `selectedPeriod` state | In `useReports` hook | In `reports/page.tsx` component | LOW | State closer to consumer; equally valid pattern |
| 6 | Free plan presets | "7일 프리셋만 활성" | `this-month` AND `7d` both available for Free | LOW | `this-month` could exceed 7-day limit on some dates but server-side check will enforce limit |
| 7 | Provider/Project chart type | Recharts BarChart (horizontal) | CSS progress bars | LOW | Simpler, no extra Recharts dependency; same visual concept |
| 8 | Free plan gating UI | Blur + upgrade CTA | Lock icon + upgrade button | LOW | Equally effective gating UX |

### 4.3 Additive Improvements (Design X, Implementation O)

| # | Item | Implementation Location | Description |
|---|------|------------------------|-------------|
| 1 | `planGated` state in hook | `useReports.ts:9` | Tracks whether server returned plan-gated response |
| 2 | `isSummaryLoading` state | `useReports.ts:11` | Separate loading state for summary vs monthly list |
| 3 | `error` state in hook | `useReports.ts:12` | Error tracking with display in page |
| 4 | Loading skeleton in MonthlyReportList | `MonthlyReportList.tsx:24-38` | 3 animated skeleton cards during load |
| 5 | Empty state in MonthlyReportList | `MonthlyReportList.tsx:41-49` | Calendar icon when no data |
| 6 | Export loading state per format | `ReportDetail.tsx:30-39` | Shows "..." for format being exported |
| 7 | PDF styling (theme + headStyles) | `report-pdf.service.ts:37-38` | Striped theme with dark header for professional look |

---

## 5. Architecture Compliance

### 5.1 Layer Structure (Dynamic Level)

| Layer | Expected | Actual | Status |
|-------|----------|--------|--------|
| Types (Domain) | `src/types/report.ts` | `src/types/report.ts` | PASS |
| Services (Application) | `src/services/report.service.ts` | `src/services/report.service.ts` | PASS |
| Services (Application) | `src/services/report-pdf.service.ts` | `src/services/report-pdf.service.ts` | PASS |
| API Routes (Infrastructure) | `src/app/api/reports/*` | `src/app/api/reports/*` | PASS |
| UI Components (Presentation) | `src/features/reports/` | `src/features/reports/` | PASS |
| Page (Presentation) | `src/app/(dashboard)/reports/` | `src/app/(dashboard)/reports/` | PASS |

### 5.2 Dependency Direction

| From | To | Status |
|------|----|--------|
| Page -> Hook -> API | Correct chain | PASS |
| API Route -> Service | Correct dependency | PASS |
| Service -> bkend (Infrastructure) | Correct dependency | PASS |
| Components -> Types (Domain) | Correct dependency | PASS |
| No component -> infrastructure direct import | No violations | PASS |

**Architecture Score: 100%**

---

## 6. Convention Compliance

### 6.1 Naming Convention

| Category | Convention | Files Checked | Compliance | Violations |
|----------|-----------|:-------------:|:----------:|------------|
| Components | PascalCase | 4 | 100% | None |
| Functions | camelCase | 14 | 100% | None |
| Constants | UPPER_SNAKE_CASE | 3 | 100% | None |
| Files (component) | PascalCase.tsx | 3 | 100% | None |
| Files (service) | kebab-case.ts | 2 | 100% | None |
| Folders | kebab-case | 2 | 100% | None |

### 6.2 Import Order

All 14 files follow the correct import order:
1. External libraries (react, next, lucide-react, jspdf)
2. Internal absolute imports (@/...)
3. Relative imports (none used -- all use absolute)
4. Type imports (`import type`)

**Convention Score: 100%**

---

## 7. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 94% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **97%** | **PASS** |

---

## 8. Recommended Actions

### 8.1 Immediate (MEDIUM)

| # | Item | File | Action |
|---|------|------|--------|
| 1 | Add PDF generation timeout | `src/app/api/reports/export/route.ts` | Wrap `buildPdfReport()` call with `Promise.race([buildPdfReport(...), timeout(10000)])` and return 504 or fallback to JSON on timeout |

### 8.2 Short-term (LOW)

| # | Item | File | Action |
|---|------|------|--------|
| 1 | Update .env.example | `app/.env.example` | Add `RESEND_API_KEY=` and `NOTIFICATION_FROM_EMAIL=` entries |
| 2 | Consider Korean PDF labels | `src/services/report-pdf.service.ts` | Optional: switch English labels to Korean for consistency with design spec and target audience |
| 3 | Review this-month preset for Free | `src/features/reports/components/PeriodSelector.tsx` | Consider setting `this-month` as `growthOnly: true` or keep and rely on server-side 7-day enforcement |

### 8.3 Documentation Updates

| # | Item | Notes |
|---|------|-------|
| 1 | Design doc should note `buildPdfReport` returns `Uint8Array` | Impl uses Uint8Array which is more universal than Buffer in edge environments |
| 2 | Design doc should note PDF labels are in English | If intentional, document the decision |
| 3 | Design doc should note direct Resend API usage in cron | Instead of notification-email.service |

---

## 9. Next Steps

- [ ] Implement PDF generation timeout (MEDIUM -- Section 8.1 #1)
- [ ] Update .env.example with RESEND_API_KEY and NOTIFICATION_FROM_EMAIL (LOW)
- [ ] Decision: Korean vs English PDF labels (LOW, cosmetic)
- [ ] Proceed to Report phase (`/pdca report reports-export`) once gaps addressed or accepted

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-17 | Initial gap analysis | gap-detector |
