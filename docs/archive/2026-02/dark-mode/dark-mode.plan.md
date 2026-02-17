# Feature Plan: Dark Mode

> Feature: dark-mode
> Created: 2026-02-18
> Status: **PLAN**
> Level: Dynamic

---

## 1. Feature Overview

LLM Cost Manager SaaS 플랫폼에 **다크 모드(Dark Mode)** 를 추가한다.
사용자가 시스템 설정에 따라 자동 전환하거나, 수동으로 Light / Dark / System 테마를 선택할 수 있도록 한다.

### 1.1 Problem Statement

- 현재 앱은 라이트 모드만 지원하며, 73개 파일에 하드코딩된 라이트 색상(bg-white, bg-slate-*, text-slate-*, border-slate-*)이 사용됨
- 어두운 환경에서 눈의 피로도 증가
- SaaS 제품의 표준 기능 부재 (경쟁 열위)

### 1.2 Goals

- CSS 변수 기반 다크 모드 지원 (class 전략, `next-themes`)
- Light / Dark / System 3가지 모드 토글
- 5개 공유 UI 컴포넌트 + 73개 파일의 하드코딩 색상 dark: variant 적용
- 사용자 테마 선택 Zustand store 저장 + localStorage 지속성
- FOUC(Flash of Unstyled Content) 방지

### 1.3 Non-Goals (Out of Scope)

- 커스텀 테마 색상 편집기 (향후)
- 브랜드 테마 / 다중 색상 팔레트
- 이미지/차트 색상 자동 반전

---

## 2. Requirements

### 2.1 Functional Requirements

| FR | Requirement | Priority |
|----|-------------|:--------:|
| FR-01 | next-themes 기반 ThemeProvider 설치 및 구성 (class 전략, SSR 안전) | P0 |
| FR-02 | globals.css에 dark 모드 CSS 변수 추가 (`.dark` 셀렉터) | P0 |
| FR-03 | 5개 공유 UI 컴포넌트에 dark: variant 적용 (Card, Button, Input, Badge, DataTable) | P0 |
| FR-04 | NavBar, Footer, Dashboard Layout에 dark: variant 적용 | P0 |
| FR-05 | 13개 feature 모듈 컴포넌트에 dark: variant 적용 | P0 |
| FR-06 | 8개 page 컴포넌트에 dark: variant 적용 (login, signup, pricing 등) | P0 |
| FR-07 | 테마 토글 컴포넌트 (Light/Dark/System 3가지) NavBar에 통합 | P0 |
| FR-08 | Zustand store에 theme 필드 추가 + localStorage 지속성 | P1 |

### 2.2 Non-Functional Requirements

| NFR | Requirement | Target |
|-----|-------------|--------|
| NFR-01 | FOUC 방지 | next-themes의 `<script>` 인라인 주입으로 해결 |
| NFR-02 | SSR 호환성 | suppressHydrationWarning on `<html>` |
| NFR-03 | 번들 크기 증가 | < 2KB (next-themes ~1.5KB gzipped) |
| NFR-04 | 접근성 | WCAG 2.1 AA 대비율 (4.5:1 텍스트, 3:1 UI) |
| NFR-05 | 성능 무영향 | 테마 전환 시 레이아웃 시프트 없음 |

---

## 3. Technical Approach

### 3.1 Strategy: CSS class + next-themes

```
1. next-themes 패키지 설치
2. ThemeProvider (attribute="class") → root layout에 래핑
3. <html> 태그에 suppressHydrationWarning 추가
4. globals.css에 .dark { --background: ...; --foreground: ...; } 추가
5. 커스텀 유틸리티(bg-gradient-hero, loading-skeleton 등) dark variant 추가
6. 모든 컴포넌트에 dark: Tailwind 클래스 추가
7. ThemeToggle 컴포넌트 생성 → NavBar에 배치
```

### 3.2 Color Mapping Strategy

| Light | Dark |
|-------|------|
| `bg-white` | `dark:bg-slate-900` |
| `bg-slate-50` | `dark:bg-slate-800/50` |
| `bg-slate-100` | `dark:bg-slate-800` |
| `bg-gray-50` | `dark:bg-slate-950` |
| `text-slate-900` | `dark:text-slate-100` |
| `text-slate-700` | `dark:text-slate-300` |
| `text-slate-600` | `dark:text-slate-400` |
| `text-slate-500` | `dark:text-slate-400` |
| `text-slate-400` | `dark:text-slate-500` |
| `border-slate-200` | `dark:border-slate-700` |
| `border-slate-100` | `dark:border-slate-800` |
| `bg-indigo-50` | `dark:bg-indigo-950/50` |

### 3.3 Affected Files Summary

| Category | Files | Description |
|----------|:-----:|-------------|
| Package | 1 | next-themes 설치 |
| New Files | 2 | ThemeProvider, ThemeToggle |
| CSS | 1 | globals.css (dark 변수) |
| Shared UI | 5 | Card, Button, Input, Badge, DataTable |
| Layout | 3 | NavBar, Footer, DashboardLayout |
| Root Layout | 1 | layout.tsx (ThemeProvider 래핑) |
| Store | 1 | store.ts (theme 필드) |
| Dashboard | 7 | StatCard, charts, selectors |
| Features | ~25 | analytics, settings, playground, templates, onboarding, etc. |
| Pages | ~15 | dashboard, providers, projects, budget, alerts, auth, pricing |
| Loading | 8 | loading.tsx 스켈레톤 |
| **Total** | **~69** | |

---

## 4. Risk Assessment

| Risk | Impact | Mitigation |
|------|:------:|------------|
| FOUC (Flash of Unstyled Content) | High | next-themes 내장 스크립트로 방지 |
| Recharts 차트 색상 | Medium | Recharts는 CSS var 미지원 → 인라인 색상 유지 (라이트/다크 구분 불필요, primary 계열 양쪽 호환) |
| SSR 하이드레이션 불일치 | Medium | suppressHydrationWarning + next-themes |
| 대량 파일 변경으로 인한 회귀 | High | 체계적 컴포넌트별 변환, build 검증 |

---

## 5. Success Criteria

- [ ] Light/Dark/System 3가지 모드 정상 작동
- [ ] FOUC 없음
- [ ] 모든 UI 컴포넌트가 다크 모드에서 가독성 확보
- [ ] Build 성공 (TypeScript 에러 0개)
- [ ] 기존 기능 회귀 없음
