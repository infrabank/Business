# Feature Design: Dark Mode

> Feature: dark-mode
> Created: 2026-02-18
> Plan: `docs/01-plan/features/dark-mode.plan.md`
> Status: **DESIGN**

---

## 1. Architecture Overview

```
Root Layout (layout.tsx)
├── ThemeProvider (next-themes, attribute="class")
│   ├── <html lang="ko" suppressHydrationWarning>
│   └── children
│
├── globals.css
│   ├── :root { light CSS vars }
│   └── .dark { dark CSS vars }
│
├── ThemeToggle (NavBar 내장)
│   ├── Sun icon → light
│   ├── Moon icon → dark
│   └── Monitor icon → system
│
└── All components use dark: Tailwind variants
```

---

## 2. Type Definitions

### 2.1 Theme Types (`src/types/theme.ts`)

```typescript
// F: new file
export type Theme = 'light' | 'dark' | 'system'
```

### 2.2 Store Update (`src/lib/store.ts`)

```typescript
// M: modify - Preferences interface에 theme 추가
interface Preferences {
  currency: CurrencyCode
  dateFormat: DateFormatType
  numberFormat: NumberFormatType
  dashboardPeriod: DashboardPeriod
  theme: Theme  // NEW
}

// default: 'system'
```

---

## 3. New Files

### 3.1 ThemeProvider (`src/components/providers/ThemeProvider.tsx`)

```typescript
// F: new file
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
```

**Key decisions:**
- `attribute="class"` → Tailwind `dark:` variant 호환
- `enableSystem` → OS 설정 자동 감지
- `disableTransitionOnChange` → 테마 전환 시 깜빡임 방지

### 3.2 ThemeToggle (`src/components/ui/ThemeToggle.tsx`)

```typescript
// F: new file
'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-9 w-9" /> // placeholder to prevent layout shift

  const options = [
    { value: 'light', icon: Sun, label: '라이트 모드' },
    { value: 'dark', icon: Moon, label: '다크 모드' },
    { value: 'system', icon: Monitor, label: '시스템 설정' },
  ] as const

  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'rounded-lg p-2 transition-all duration-200',
            theme === value
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          )}
          aria-label={label}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
```

---

## 4. CSS Changes

### 4.1 globals.css Dark Variables

```css
/* M: modify - add after :root */
.dark {
  --background: #0B1120;
  --foreground: #E2E8F0;
}

/* M: modify - ::selection dark */
.dark ::selection {
  background-color: rgb(99 102 241 / 0.3);
  color: #E0E7FF;
}

/* M: modify - scrollbar dark */
.dark * {
  scrollbar-color: #334155 transparent;
}
.dark ::-webkit-scrollbar-thumb { background: #334155; }
.dark ::-webkit-scrollbar-thumb:hover { background: #475569; }

/* M: modify - bg-gradient-hero dark variant */
@utility bg-gradient-hero {
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgb(99 102 241 / 0.12), transparent),
    radial-gradient(ellipse 60% 50% at 80% 50%, rgb(139 92 246 / 0.08), transparent),
    radial-gradient(ellipse 50% 50% at 20% 80%, rgb(14 165 233 / 0.06), transparent),
    var(--background);
}

/* M: modify - loading-skeleton dark variant */
@utility loading-skeleton {
  background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite linear;
}
/* dark override via Tailwind class: dark:loading-skeleton-dark */
@utility loading-skeleton-dark {
  background: linear-gradient(90deg, #1E293B 25%, #334155 50%, #1E293B 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite linear;
}
```

---

## 5. Component Modifications

### 5.1 Root Layout (`src/app/layout.tsx`)

```typescript
// M: modify
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 5.2 Shared UI Components

#### Card.tsx
```typescript
// M: modify
// Card: 'bg-white' → 'bg-white dark:bg-slate-900'
//        'border-slate-200/60' → 'border-slate-200/60 dark:border-slate-700/60'
//        'hover:shadow-md' → 'hover:shadow-md dark:hover:shadow-slate-900/50'
// CardHeader: 'border-slate-100' → 'border-slate-100 dark:border-slate-800'
```

#### Button.tsx
```typescript
// M: modify - each variant gets dark: counterpart
// secondary: 'bg-slate-100 text-slate-700' → add 'dark:bg-slate-800 dark:text-slate-300'
// outline: 'border-slate-200 bg-white text-slate-700' → add 'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
// ghost: 'text-slate-600 hover:bg-slate-100/80' → add 'dark:text-slate-400 dark:hover:bg-slate-800/80'
// focus-visible:ring-offset-2 → add 'dark:focus-visible:ring-offset-slate-900'
```

#### Input.tsx
```typescript
// M: modify
// label: 'text-slate-700' → add 'dark:text-slate-300'
// input: 'bg-white border-slate-200' → add 'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100'
// placeholder: 'placeholder:text-slate-300' → add 'dark:placeholder:text-slate-600'
// error border: 'border-rose-300' → add 'dark:border-rose-500/50'
```

#### Badge.tsx
```typescript
// M: modify - each variant gets dark: counterpart
// default: 'bg-slate-100 text-slate-600' → add 'dark:bg-slate-800 dark:text-slate-400'
// success: 'bg-emerald-50 text-emerald-700' → add 'dark:bg-emerald-950/50 dark:text-emerald-400'
// warning: 'bg-amber-50 text-amber-700' → add 'dark:bg-amber-950/50 dark:text-amber-400'
// danger: 'bg-rose-50 text-rose-700' → add 'dark:bg-rose-950/50 dark:text-rose-400'
// info: 'bg-indigo-50 text-indigo-700' → add 'dark:bg-indigo-950/50 dark:text-indigo-400'
```

#### DataTable.tsx
```typescript
// M: modify
// empty: 'border-slate-200/60 text-slate-400' → add 'dark:border-slate-700/60 dark:text-slate-500'
// wrapper: 'border-slate-200/60' → add 'dark:border-slate-700/60'
// header: 'border-slate-100 bg-slate-50/80' → 'dark:border-slate-800 dark:bg-slate-800/50'
// th: 'text-slate-500' → add 'dark:text-slate-400'
// row: 'border-slate-50 hover:bg-indigo-50/30' → add 'dark:border-slate-800 dark:hover:bg-indigo-950/20'
```

### 5.3 Toast.tsx
```typescript
// M: modify - STYLES에 dark 변형 추가
// success: add 'dark:border-emerald-800/60 dark:bg-emerald-950/90 dark:text-emerald-300'
// error: add 'dark:border-rose-800/60 dark:bg-rose-950/90 dark:text-rose-300'
// warning: add 'dark:border-amber-800/60 dark:bg-amber-950/90 dark:text-amber-300'
// info: add 'dark:border-indigo-800/60 dark:bg-indigo-950/90 dark:text-indigo-300'
```

### 5.4 Layout Components

#### NavBar.tsx
```typescript
// M: modify
// nav: 'border-slate-200/60 bg-white/80' → add 'dark:border-slate-700/60 dark:bg-slate-900/80'
// active link: 'bg-indigo-50 text-indigo-700' → add 'dark:bg-indigo-950/50 dark:text-indigo-400'
// inactive link: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80' → add 'dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80'
// settings icon: 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' → add 'dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800'
// dropdown: 'border-slate-200/60 bg-white/95' → add 'dark:border-slate-700/60 dark:bg-slate-900/95'
// dropdown text: 'text-slate-900' → add 'dark:text-slate-100'
// dropdown subtext: 'text-slate-500' → add 'dark:text-slate-400'
// dropdown item: 'text-slate-700 hover:bg-slate-50' → add 'dark:text-slate-300 dark:hover:bg-slate-800'
// mobile menu: 'bg-white/95' → add 'dark:bg-slate-900/95'
// mobile items: 'text-slate-600 hover:bg-slate-100' → add 'dark:text-slate-400 dark:hover:bg-slate-800'
// mobile hr: 'border-slate-100' → add 'dark:border-slate-800'
// ThemeToggle 추가: settings 아이콘 옆에 배치
```

#### Footer.tsx
```typescript
// M: modify (Footer는 이미 dark 계열 색상 사용 중, 거의 변경 불필요)
// 현재: bg-slate-900, border-slate-800, text-slate-500/400 → dark에서도 유사하게 유지
// 약간의 조정: dark:bg-slate-950 dark:border-slate-800
```

#### Dashboard Layout (`src/app/(dashboard)/layout.tsx`)
```typescript
// M: modify
// 'bg-gray-50' → 'bg-gray-50 dark:bg-slate-950'
```

### 5.5 Dashboard Components

#### StatCard.tsx
```typescript
// M: modify
// title: 'text-slate-500' → add 'dark:text-slate-400'
// value: 'text-slate-900' → add 'dark:text-slate-100'
// change positive bg: 'bg-emerald-50 text-emerald-700' → add 'dark:bg-emerald-950/50 dark:text-emerald-400'
// change negative bg: 'bg-rose-50 text-rose-700' → add 'dark:bg-rose-950/50 dark:text-rose-400'
// subtitle: 'text-slate-500' → add 'dark:text-slate-400'
```

#### PeriodSelector.tsx
```typescript
// M: modify
// container: 'bg-slate-100/80' → add 'dark:bg-slate-800/80'
// active: 'bg-white text-indigo-700' → add 'dark:bg-slate-700 dark:text-indigo-400'
// inactive: 'text-slate-500 hover:text-slate-700' → add 'dark:text-slate-400 dark:hover:text-slate-200'
```

#### ProviderFilter.tsx
```typescript
// M: modify
// active: 'bg-indigo-50 text-indigo-700 border-indigo-200' → add 'dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800'
// inactive: 'border-slate-200 text-slate-500 hover:bg-slate-50' → add 'dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
```

#### CostTrendChart.tsx (CustomTooltip)
```typescript
// M: modify
// tooltip: 'border-slate-200/60 bg-white/95' → add 'dark:border-slate-700/60 dark:bg-slate-900/95'
// date: 'text-slate-500' → add 'dark:text-slate-400'
// CartesianGrid stroke: '#F1F5F9' → 변경 불필요 (차트는 인라인 색상 유지, dark에서 미세 라인 유지)
```

### 5.6 Settings Components

#### SettingsTabs.tsx
```typescript
// M: modify
// desktop border: 'border-gray-200' → add 'dark:border-slate-700'
// active: 'border-blue-600 text-blue-600' → add 'dark:border-indigo-400 dark:text-indigo-400'
// inactive: 'text-gray-500 hover:border-gray-300 hover:text-gray-700' → add 'dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200'
// mobile select: 'border-gray-300 bg-white text-gray-900' → add 'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
```

### 5.7 Auth Pages

#### login/page.tsx & signup/page.tsx
```typescript
// M: modify
// card: 'border-slate-200/60 bg-white/95' → add 'dark:border-slate-700/60 dark:bg-slate-900/95'
// subtitle: 'text-slate-500' → add 'dark:text-slate-400'
// error: 'bg-rose-50 border-rose-200/60 text-rose-600' → add 'dark:bg-rose-950/50 dark:border-rose-800/60 dark:text-rose-400'
// link: 'text-slate-500' → add 'dark:text-slate-400'
```

### 5.8 Loading Skeletons (8 files)

```typescript
// M: modify all loading.tsx files
// 'bg-slate-100' → add 'dark:bg-slate-800'
// 'bg-slate-200' → add 'dark:bg-slate-700'
// 'bg-white' → add 'dark:bg-slate-900'
```

### 5.9 Remaining Feature Components (~25 files)

Pattern: 모든 하드코딩된 라이트 색상에 대응하는 dark: variant 추가

```
bg-white             → dark:bg-slate-900
bg-slate-50          → dark:bg-slate-800/50
bg-slate-100         → dark:bg-slate-800
bg-slate-100/80      → dark:bg-slate-800/80
bg-indigo-50         → dark:bg-indigo-950/50
bg-emerald-50        → dark:bg-emerald-950/50
bg-amber-50          → dark:bg-amber-950/50
bg-rose-50           → dark:bg-rose-950/50
text-slate-900       → dark:text-slate-100
text-slate-800       → dark:text-slate-200
text-slate-700       → dark:text-slate-300
text-slate-600       → dark:text-slate-400
text-slate-500       → dark:text-slate-400
text-slate-400       → dark:text-slate-500
text-slate-300       → dark:text-slate-600
border-slate-200     → dark:border-slate-700
border-slate-200/60  → dark:border-slate-700/60
border-slate-100     → dark:border-slate-800
border-slate-50      → dark:border-slate-800
border-gray-200      → dark:border-slate-700
border-gray-300      → dark:border-slate-600
hover:bg-slate-50    → dark:hover:bg-slate-800
hover:bg-slate-100   → dark:hover:bg-slate-800
hover:bg-slate-100/80 → dark:hover:bg-slate-800/80
```

---

## 6. Implementation Order

| Phase | Files | Description |
|:-----:|:-----:|-------------|
| 1 | 1 | `npm install next-themes` |
| 2 | 2 | New files: ThemeProvider, ThemeToggle |
| 3 | 1 | `src/types/theme.ts` type 정의 |
| 4 | 1 | globals.css dark 변수 추가 |
| 5 | 1 | Root layout.tsx ThemeProvider 래핑 |
| 6 | 5 | 공유 UI: Card, Button, Input, Badge, DataTable |
| 7 | 1 | Toast.tsx dark variants |
| 8 | 3 | Layout: NavBar (+ ThemeToggle), Footer, DashboardLayout |
| 9 | 1 | Store: theme field 추가 |
| 10 | 7 | Dashboard 컴포넌트 (StatCard, charts, selectors) |
| 11 | 7 | Settings 컴포넌트 |
| 12 | 2 | Auth 페이지 (login, signup) |
| 13 | ~15 | Pages (dashboard, providers, projects, budget, alerts, pricing, etc.) |
| 14 | ~25 | Feature 컴포넌트 (analytics, playground, templates, onboarding, notifications, anomaly, reports, team, proxy, landing) |
| 15 | 8 | Loading skeletons |

---

## 7. Testing Strategy

| Test | Method |
|------|--------|
| Build 성공 | `npm run build` — TypeScript 에러 0 |
| FOUC 방지 | 브라우저 새로고침 시 깜빡임 없음 |
| Light 모드 | 기존 UI와 동일한 외관 |
| Dark 모드 | 모든 컴포넌트 가독성 확보, 대비율 충족 |
| System 모드 | OS 테마 변경에 자동 반응 |
| 토글 기능 | Light → Dark → System 순환 |
| SSR 호환 | 하이드레이션 에러 없음 |

---

## 8. Dependencies

| Package | Version | Size | Purpose |
|---------|---------|------|---------|
| next-themes | ^0.4 | ~1.5KB gzipped | Theme provider, SSR-safe, FOUC prevention |

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Recharts 인라인 색상 | indigo/violet 계열은 light/dark 모두에서 충분한 가시성 → 변경 불필요 |
| CartesianGrid stroke #F1F5F9 | dark에서 거의 보이지 않음 → 보이지만 미세한 수준으로 허용 가능, 또는 컴포넌트별 조건부 변경 검토 |
| CSS 유틸리티 (text-gradient) | gradient 색상은 indigo-violet 계열, dark에서도 선명 → 변경 불필요 |
| bg-gradient-hero 하드코딩 #F8FAFC | `var(--background)` 로 교체하여 dark 자동 대응 |
