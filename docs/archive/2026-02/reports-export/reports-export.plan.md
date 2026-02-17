# Plan: reports-export

> 비용 리포트 & 데이터 내보내기 - 동적 리포트 생성, 다중 포맷 지원(CSV/JSON/PDF), 기간별 분석, 스케줄 리포트

## 1. Problem Statement

### 현재 상태
- `/reports` 페이지에 **하드코딩된 2개 월별 리포트** (2026-01, 2026-02)만 표시
- `/api/reports/export`는 기본 CSV만 지원 (usage-records raw dump)
- period 파라미터가 UI에서 전달되지만 API에서 date 필터로 변환되지 않음
- 리포트에 프로바이더별/모델별/프로젝트별 분석 없음
- PDF 내보내기 미지원
- 스케줄 리포트 (월간 자동 생성) 미지원
- Growth 플랜 게이팅 미적용 (export feature는 plan-limits에 정의되어 있지만 미사용)

### 목표
- 실시간 데이터 기반 동적 월별 리포트 생성
- CSV, JSON, PDF 3가지 포맷 내보내기
- 프로바이더별, 모델별, 프로젝트별 breakdown 분석 포함
- 커스텀 기간 선택 (from ~ to)
- 월간 리포트 이메일 발송 (Growth 플랜, cron 연계)
- Free 플랜: CSV 7일 / Growth: 전체 포맷 365일

## 2. Feature Requirements

### FR-01: 동적 월별 리포트 목록
- `/reports` 페이지에서 실제 usage-records 데이터 기반 월별 리포트 자동 생성
- 각 월의 총 비용, 요청 수, 토큰 수 표시
- 최근 12개월까지 표시 (Growth) / 최근 1개월 (Free)
- 현재 월은 "진행 중" 상태로 표시

### FR-02: 멀티 포맷 내보내기
- **CSV**: 기존 형식 개선 (프로바이더/모델/프로젝트 컬럼 추가, BOM 포함 UTF-8)
- **JSON**: 구조화된 리포트 데이터 (summary + breakdown + records)
- **PDF**: HTML → PDF 변환 (서버사이드), 차트 포함 불가 → 테이블 기반 깔끔한 레이아웃
- Free: CSV만 / Growth: CSV + JSON + PDF

### FR-03: 리포트 상세 분석
- 선택한 기간의 종합 분석 페이지
- 프로바이더별 비용 breakdown (pie chart 또는 bar)
- 모델별 Top 10 비용 순위
- 프로젝트별 비용 비교
- 일별 비용 추이 (line chart)
- 전월 대비 변화율

### FR-04: 커스텀 기간 선택
- DateRange picker (from ~ to)
- 프리셋: 이번 달, 지난 달, 최근 7일, 최근 30일, 최근 90일
- Free: 최근 7일만 / Growth: 최대 365일

### FR-05: Growth 플랜 게이팅
- `isFeatureAvailable(plan, 'export')` 활용
- Free: CSV 포맷만, 최근 7일, 상세 분석 불가
- Growth: 모든 포맷, 최대 365일, 상세 분석 가능
- 업그레이드 유도 UI 표시

### FR-06: 리포트 API 개선
- `/api/reports/export` 확장: format 쿼리 파라미터 (csv/json/pdf)
- `/api/reports/summary` 신규: 기간별 종합 분석 데이터
- `/api/reports/monthly` 신규: 월별 리포트 목록 (실제 데이터 집계)
- 플랜 게이팅 적용

### FR-07: 월간 리포트 이메일 (Growth)
- 기존 notification 시스템의 이메일 서비스 활용
- `/api/cron/report-usage` 확장: 월간 리포트 HTML 생성 + 이메일 발송
- Growth 플랜 사용자에게만 발송
- 알림 preferences의 이메일 채널 recipients 활용

### FR-08: PDF 생성 서비스
- 서버사이드 HTML → PDF 변환
- @react-pdf/renderer 또는 html-pdf-node 라이브러리 사용
- 브랜딩 헤더/푸터 포함
- 테이블 기반 레이아웃 (프로바이더별, 모델별, 프로젝트별)

## 3. Success Criteria

| # | Criteria | Metric |
|---|---------|--------|
| 1 | 동적 월별 리포트 목록 | 실제 데이터 기반 월별 카드 표시 |
| 2 | CSV 내보내기 개선 | BOM UTF-8, 프로바이더/모델/프로젝트 컬럼 |
| 3 | JSON 내보내기 | 구조화된 summary + breakdown + records |
| 4 | PDF 내보내기 | 테이블 기반 깔끔한 PDF 다운로드 |
| 5 | 커스텀 기간 선택 | from/to picker + 프리셋 |
| 6 | 리포트 상세 분석 | 프로바이더/모델/프로젝트 breakdown |
| 7 | 플랜 게이팅 적용 | Free=CSV 7일, Growth=전체 |
| 8 | 월간 이메일 리포트 | Growth 사용자에게 월간 요약 발송 |
| 9 | 빌드 에러 0건 | TypeScript 빌드 통과 |
| 10 | 기존 기능 영향 없음 | dashboard, export API 하위호환 |

## 4. Scope

### In Scope
- `/reports` 페이지 전면 리디자인 (동적 데이터)
- `/api/reports/export` 확장 (CSV/JSON/PDF)
- `/api/reports/summary` 신규 API
- `/api/reports/monthly` 신규 API
- PDF 생성 서비스
- 커스텀 기간 선택 UI
- 플랜 게이팅
- 월간 이메일 리포트 (기존 cron 확장)

### Out of Scope
- 실시간 대시보드 차트 (이미 dashboard에 구현됨)
- Slack/Webhook 리포트 전송 (notifications 시스템에서 이미 지원)
- 리포트 스케줄링 UI (cron은 서버에서 고정)
- 리포트 템플릿 커스터마이징

## 5. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| usage-records 데이터 | Available | bkend DB에 실제 데이터 존재 |
| plan-limits.ts | Available | 'export' feature 이미 정의됨 |
| notification email service | Available | PDCA #10에서 구현 완료 |
| /api/cron/report-usage | Available | 기존 cron 엔드포인트 존재 |
| dashboard summary API | Available | 분석 로직 재사용 가능 |

## 6. Estimated Scope

| Category | Count |
|----------|-------|
| New files | ~10 |
| Modified files | ~5 |
| Total LOC | ~1,200 |
| PDCA phases | Plan → Design → Do → Check → Report |

## 7. Risks

| Risk | Mitigation |
|------|------------|
| PDF 라이브러리 Vercel 호환성 | html-pdf-node 대신 @react-pdf/renderer (순수 JS) 사용 |
| 대량 데이터 내보내기 성능 | 최대 365일 제한, 페이징 불필요 (usage-records는 일 단위 집계) |
| CSV 한글 깨짐 | BOM (Byte Order Mark) 추가 |
| 이메일 리포트 중복 발송 | 월간 cron은 1일 1회, 발송 로그로 중복 방지 |
