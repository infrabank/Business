# Design: Landing Page - 전환율 최적화 마케팅 페이지

> Plan Reference: `docs/01-plan/features/landing-page.plan.md`

## 1. Architecture Overview

### 페이지 구조 (섹션 순서)
```
┌─────────────────────────────────────────┐
│  Navigation Header (sticky)      FR-09  │
├─────────────────────────────────────────┤
│  Hero Section                    FR-01  │
├─────────────────────────────────────────┤
│  Logo Banner (Social Proof)      FR-02  │
├─────────────────────────────────────────┤
│  Features Showcase (6개)         FR-03  │
├─────────────────────────────────────────┤
│  How It Works (3 steps)          FR-04  │
├─────────────────────────────────────────┤
│  Stats / Numbers                 FR-06  │
├─────────────────────────────────────────┤
│  Testimonials (3 cards)          FR-05  │
├─────────────────────────────────────────┤
│  FAQ Accordion                   FR-07  │
├─────────────────────────────────────────┤
│  Final CTA                       FR-08  │
├─────────────────────────────────────────┤
│  Footer (기존 컴포넌트 재사용)   FR-10  │
└─────────────────────────────────────────┘
```

### 컴포넌트 트리
```
page.tsx (Server Component)
├── <nav> (inline - sticky header)
├── <HeroSection />          (Server)
├── <LogoBanner />           (Server)
├── <FeaturesShowcase />     (Server)
├── <HowItWorks />           (Server)
├── <StatsSection />         (Server)
├── <Testimonials />         (Server)
├── <FaqSection />           (Client - 'use client')
├── <FinalCta />             (Server)
└── <Footer />               (기존 컴포넌트)
```

### 렌더링 전략
- **Server Components**: HeroSection, LogoBanner, FeaturesShowcase, HowItWorks, StatsSection, Testimonials, FinalCta
- **Client Components**: FaqSection만 (accordion 상태 관리)
- **이유**: JS 번들 최소화, SEO 최적화, 빠른 초기 렌더링

## 2. Data Structures

### `landing-data.ts` - 정적 데이터 정의

```typescript
import type { LucideIcon } from 'lucide-react'

// FR-03: Features
export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

// FR-04: How It Works
export interface Step {
  number: number
  title: string
  description: string
  icon: LucideIcon
}

// FR-05: Testimonials
export interface Testimonial {
  quote: string
  name: string
  role: string
  company: string
  initials: string
}

// FR-06: Stats
export interface Stat {
  value: string
  label: string
}

// FR-07: FAQ
export interface FaqItem {
  question: string
  answer: string
}

// FR-02: Logos
export interface CompanyLogo {
  name: string
}
```

### 데이터 내용

#### Features (FR-03)
```typescript
export const features: Feature[] = [
  {
    icon: BarChart3,
    title: 'Unified Dashboard',
    description: 'See all your LLM spending across OpenAI, Anthropic, and Google in one view. Track costs by project, team, or model.'
  },
  {
    icon: Bell,
    title: 'Budget Alerts',
    description: 'Set monthly budgets and get instant notifications before you exceed them. Never face surprise bills again.'
  },
  {
    icon: Lightbulb,
    title: 'Cost Optimization',
    description: 'AI-powered recommendations to reduce spending. Find cheaper models, batch opportunities, and unused API keys.'
  },
  {
    icon: Activity,
    title: 'Real-time Tracking',
    description: 'Monitor your API usage as it happens. See per-request costs, token counts, and response latencies live.'
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Allocate budgets by team or project. Track who spends what and enforce per-team limits.'
  },
  {
    icon: FileText,
    title: 'Detailed Reports',
    description: 'Export comprehensive reports by provider, model, or date range. CSV and PDF export for stakeholder reviews.'
  }
]
```

#### Steps (FR-04)
```typescript
export const steps: Step[] = [
  {
    number: 1,
    title: 'Connect',
    description: 'Add your API keys from OpenAI, Anthropic, or Google. Setup takes less than 2 minutes.',
    icon: Key
  },
  {
    number: 2,
    title: 'Monitor',
    description: 'Start tracking costs in real-time. See spending breakdowns by provider, model, and project.',
    icon: Eye
  },
  {
    number: 3,
    title: 'Optimize',
    description: 'Get AI-powered recommendations to cut costs by up to 50%. Switch models, batch requests, and eliminate waste.',
    icon: TrendingDown
  }
]
```

#### Testimonials (FR-05)
```typescript
export const testimonials: Testimonial[] = [
  {
    quote: 'We were spending $15K/month on LLM APIs without knowing where the money went. LLM Cost Manager helped us cut that by 40% in the first month.',
    name: 'Sarah Chen',
    role: 'CTO',
    company: 'DataFlow AI',
    initials: 'SC'
  },
  {
    quote: 'The budget alerts alone saved us from a $5K overage. Now our team can experiment freely knowing we have guardrails in place.',
    name: 'Marcus Rivera',
    role: 'Engineering Lead',
    company: 'NexGen Labs',
    initials: 'MR'
  },
  {
    quote: 'Switching from GPT-4 to Claude where appropriate saved us 30% on our monthly bill. The optimization tips were spot on.',
    name: 'Emily Park',
    role: 'AI Product Manager',
    company: 'BuildSmart',
    initials: 'EP'
  }
]
```

#### Stats (FR-06)
```typescript
export const stats: Stat[] = [
  { value: '$2M+', label: 'Saved by our users' },
  { value: '10K+', label: 'API calls tracked daily' },
  { value: '50%', label: 'Average cost reduction' },
  { value: '3', label: 'Providers supported' }
]
```

#### FAQ (FR-07)
```typescript
export const faqItems: FaqItem[] = [
  {
    question: 'What LLM providers do you support?',
    answer: 'We currently support OpenAI, Anthropic (Claude), and Google AI (Gemini). More providers are on our roadmap.'
  },
  {
    question: 'Is my API key secure?',
    answer: 'Yes. API keys are encrypted with AES-256 before storage and are never exposed in the dashboard. We use industry-standard security practices.'
  },
  {
    question: 'Can I try before buying?',
    answer: 'Absolutely. Our Free plan lets you connect 1 provider and track 7 days of history at no cost. No credit card required.'
  },
  {
    question: 'How does billing work?',
    answer: 'We offer monthly subscriptions starting at $29/month. You can upgrade, downgrade, or cancel anytime. All plans include a 14-day free trial.'
  },
  {
    question: 'What happens if I exceed my budget?',
    answer: 'You\'ll receive alerts at 50%, 80%, and 100% of your budget. We never cut off your API access — we just keep you informed so you can take action.'
  }
]
```

#### Company Logos (FR-02)
```typescript
export const companyLogos: CompanyLogo[] = [
  { name: 'TechCorp' },
  { name: 'AI Labs' },
  { name: 'DataFlow' },
  { name: 'CloudScale' },
  { name: 'NexGen' },
  { name: 'BuildSmart' }
]
```

## 3. Component Specifications

### FR-01: HeroSection.tsx

**파일**: `src/features/landing/components/HeroSection.tsx`
**타입**: Server Component

```
Layout:
┌───────────────────────────────────────────────┐
│              [Badge: Stop overspending on AI]  │
│                                               │
│   Take control of your LLM costs              │
│   (h1, max-w-4xl, text-5xl → lg:text-6xl)    │
│                                               │
│   One dashboard for all your AI spending.     │
│   Track, optimize, and budget across          │
│   OpenAI, Anthropic, and Google.              │
│   (p, max-w-2xl, text-lg)                     │
│                                               │
│   [Start Free →]  [View Pricing]              │
│                                               │
│   ✓ No credit card required                   │
│   ✓ Setup in 2 minutes                        │
│                                               │
│   ┌─────────────────────────────────────┐     │
│   │     Dashboard Preview Placeholder    │     │
│   │     (rounded-xl, border, shadow-lg,  │     │
│   │      bg-gray-100, h-64 lg:h-96)     │     │
│   └─────────────────────────────────────┘     │
└───────────────────────────────────────────────┘
```

**Props**: None
**Imports**: `Link` from next/link, `ArrowRight`, `CheckCircle`, `Zap` from lucide-react

### FR-02: LogoBanner.tsx

**파일**: `src/features/landing/components/LogoBanner.tsx`
**타입**: Server Component

```
Layout:
┌───────────────────────────────────────────────┐
│  Trusted by 1,000+ teams worldwide            │
│                                               │
│  [TechCorp] [AI Labs] [DataFlow]              │
│  [CloudScale] [NexGen] [BuildSmart]           │
│  (text-gray-400, font-semibold, grayscale)    │
└───────────────────────────────────────────────┘
```

**Props**: None
**데이터**: `companyLogos` from landing-data.ts
**스타일**: `py-12`, border-y, bg-white, 로고는 flex wrap justify-center gap-8~12

### FR-03: FeaturesShowcase.tsx

**파일**: `src/features/landing/components/FeaturesShowcase.tsx`
**타입**: Server Component

```
Layout:
┌───────────────────────────────────────────────┐
│  Everything you need to manage AI costs (h2)  │
│  Stop guessing. Start optimizing. (subtitle)  │
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Icon     │ │ Icon     │ │ Icon     │      │
│  │ Title    │ │ Title    │ │ Title    │      │
│  │ Desc     │ │ Desc     │ │ Desc     │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Icon     │ │ Icon     │ │ Icon     │      │
│  │ Title    │ │ Title    │ │ Title    │      │
│  │ Desc     │ │ Desc     │ │ Desc     │      │
│  └──────────┘ └──────────┘ └──────────┘      │
└───────────────────────────────────────────────┘
```

**Props**: None
**데이터**: `features` from landing-data.ts
**그리드**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`
**카드 스타일**: rounded-xl, border, p-8, hover:shadow-md transition

### FR-04: HowItWorks.tsx

**파일**: `src/features/landing/components/HowItWorks.tsx`
**타입**: Server Component

```
Layout:
┌───────────────────────────────────────────────┐
│  How it works (h2, centered)                  │
│  Get started in minutes (subtitle)            │
│                                               │
│     ①              ②              ③           │
│   [Icon]  ─────  [Icon]  ─────  [Icon]       │
│  Connect        Monitor        Optimize       │
│  Add your       Track costs    Get AI         │
│  API keys       in real-time   recommendations│
└───────────────────────────────────────────────┘
```

**Props**: None
**데이터**: `steps` from landing-data.ts
**레이아웃**: flex 또는 grid-cols-3, 단계 사이 연결선은 hidden md:block의 border-t
**넘버링**: w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center

### FR-05: Testimonials.tsx

**파일**: `src/features/landing/components/Testimonials.tsx`
**타입**: Server Component

```
Layout:
┌───────────────────────────────────────────────┐
│  What our users say (h2, centered)            │
│                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌────────┐│
│  │ "Quote..."   │ │ "Quote..."   │ │"Quote" ││
│  │              │ │              │ │        ││
│  │ [SC] Sarah   │ │ [MR] Marcus  │ │[EP] Em ││
│  │ CTO,DataFlow │ │ Lead,NexGen  │ │PM,Build││
│  └──────────────┘ └──────────────┘ └────────┘│
└───────────────────────────────────────────────┘
```

**Props**: None
**데이터**: `testimonials` from landing-data.ts
**아바타**: w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-semibold, 이니셜 표시
**카드 스타일**: border rounded-xl p-6~8, quote는 text-gray-700 italic

### FR-06: StatsSection.tsx

**파일**: `src/features/landing/components/StatsSection.tsx`
**타입**: Server Component

```
Layout:
┌───────────────────────────────────────────────┐
│  bg-blue-600 text-white py-16                 │
│                                               │
│  [$2M+]      [10K+]      [50%]      [3]     │
│  Saved by    API calls   Avg cost   Providers│
│  our users   tracked     reduction  supported│
│              daily                            │
└───────────────────────────────────────────────┘
```

**Props**: None
**데이터**: `stats` from landing-data.ts
**레이아웃**: grid-cols-2 md:grid-cols-4 gap-8, 숫자는 text-4xl font-bold

### FR-07: FaqSection.tsx

**파일**: `src/features/landing/components/FaqSection.tsx`
**타입**: Client Component (`'use client'`)

```
Layout:
┌───────────────────────────────────────────────┐
│  Frequently asked questions (h2, centered)    │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ ▶ What LLM providers do you support?    │  │
│  ├─────────────────────────────────────────┤  │
│  │ ▼ Is my API key secure?                 │  │
│  │   Yes. API keys are encrypted with...   │  │
│  ├─────────────────────────────────────────┤  │
│  │ ▶ Can I try before buying?              │  │
│  ├─────────────────────────────────────────┤  │
│  │ ▶ How does billing work?                │  │
│  ├─────────────────────────────────────────┤  │
│  │ ▶ What happens if I exceed my budget?   │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

**상태 관리**:
```typescript
const [openIndex, setOpenIndex] = useState<number | null>(null)

function toggle(index: number) {
  setOpenIndex(openIndex === index ? null : index)
}
```

**Props**: None
**데이터**: `faqItems` from landing-data.ts
**아이콘**: ChevronDown (rotate-180 on open transition)
**접근성**: `button` 요소, `aria-expanded`, `aria-controls`
**애니메이션**: `overflow-hidden transition-all duration-200`, max-height 토글

### FR-08: FinalCta.tsx

**파일**: `src/features/landing/components/FinalCta.tsx`
**타입**: Server Component

```
Layout:
┌───────────────────────────────────────────────┐
│  bg-gray-900 text-white py-20                 │
│                                               │
│  Ready to take control of                     │
│  your AI costs? (h2, text-3xl)                │
│                                               │
│  Join thousands of teams already saving       │
│  money on their LLM spending. (p)             │
│                                               │
│  [Start Free Today →]                         │
│                                               │
│  Free plan available · No credit card needed  │
└───────────────────────────────────────────────┘
```

**Props**: None
**CTA 버튼**: bg-white text-gray-900 hover:bg-gray-100, 눈에 띄는 반전 색상

### FR-09: Navigation Header (page.tsx 내 inline)

**구현 위치**: `page.tsx` 내 `<nav>` 요소

```
Layout:
┌───────────────────────────────────────────────┐
│  [⚡ LLM Cost Manager]  Features Pricing FAQ  │
│                                    [Log in]   │
│                                    [Start Free]│
└───────────────────────────────────────────────┘
```

**Sticky**: `sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b`
**네비게이션 링크**: `<a href="#features">`, `<a href="#pricing">`, `<a href="#faq">`
- Features → `/pricing` (별도 페이지) 대신 `#features` 앵커 사용
- Pricing → `<Link href="/pricing">` (별도 Pricing 페이지로 이동)
- FAQ → `#faq` 앵커

### FR-10: Footer 재사용

**구현**: 기존 `src/components/layout/Footer.tsx` import
```typescript
import { Footer } from '@/components/layout/Footer'
```

## 4. File Changes

### 새로 생성할 파일 (9개)

| # | File Path | Type | LOC (예상) | FR |
|---|-----------|------|-----------|-----|
| 1 | `src/features/landing/data/landing-data.ts` | Data | ~120 | ALL |
| 2 | `src/features/landing/components/HeroSection.tsx` | Server | ~50 | FR-01 |
| 3 | `src/features/landing/components/LogoBanner.tsx` | Server | ~30 | FR-02 |
| 4 | `src/features/landing/components/FeaturesShowcase.tsx` | Server | ~40 | FR-03 |
| 5 | `src/features/landing/components/HowItWorks.tsx` | Server | ~50 | FR-04 |
| 6 | `src/features/landing/components/StatsSection.tsx` | Server | ~30 | FR-06 |
| 7 | `src/features/landing/components/Testimonials.tsx` | Server | ~45 | FR-05 |
| 8 | `src/features/landing/components/FaqSection.tsx` | Client | ~55 | FR-07 |
| 9 | `src/features/landing/components/FinalCta.tsx` | Server | ~30 | FR-08 |

### 수정할 파일 (1개)

| # | File Path | Changes | FR |
|---|-----------|---------|-----|
| 1 | `src/app/page.tsx` | 전면 리디자인 - 모든 섹션 컴포넌트 조합 + nav header | FR-09, FR-10 |

### 총 예상 LOC: ~450줄 (신규) + ~45줄 (수정)

## 5. Implementation Order

```
Phase 1: Data Layer
  1. landing-data.ts          (모든 정적 데이터 정의)

Phase 2: Server Components (병렬 가능)
  2. HeroSection.tsx          (메인 히어로)
  3. LogoBanner.tsx           (소셜 프루프)
  4. FeaturesShowcase.tsx     (기능 쇼케이스)
  5. HowItWorks.tsx           (사용 방법)
  6. StatsSection.tsx         (핵심 수치)
  7. Testimonials.tsx         (고객 후기)
  8. FinalCta.tsx             (마무리 CTA)

Phase 3: Client Component
  9. FaqSection.tsx           (FAQ accordion)

Phase 4: Page Assembly
  10. page.tsx                (전체 조합 + nav)
```

## 6. Section Anchors & SEO

### 앵커 ID 매핑
| Section | id | 용도 |
|---------|-----|------|
| Features | `features` | nav 링크 `#features` |
| FAQ | `faq` | nav 링크 `#faq` |

### SEO Metadata (page.tsx에서 export)
```typescript
export const metadata: Metadata = {
  title: 'LLM Cost Manager - Track & Optimize Your AI Spending',
  description: 'One dashboard for all your LLM costs. Track OpenAI, Anthropic, and Google AI spending in real-time. Get optimization tips and never exceed your budget.',
  openGraph: {
    title: 'LLM Cost Manager - Track & Optimize Your AI Spending',
    description: 'One dashboard for all your LLM costs. Track, optimize, and budget across OpenAI, Anthropic, and Google.',
    type: 'website',
  },
}
```

## 7. Responsive Breakpoints

| Breakpoint | Features Grid | Steps | Stats | Testimonials |
|------------|--------------|-------|-------|--------------|
| < 640px (mobile) | 1 col | 1 col (vertical) | 2x2 grid | 1 col |
| 640-768px (sm) | 1 col | 1 col | 2x2 grid | 1 col |
| 768-1024px (md) | 2 col | 3 col (horizontal) | 4 col | 2 col |
| > 1024px (lg) | 3 col | 3 col | 4 col | 3 col |

## 8. Color Scheme

| Section | Background | Text |
|---------|-----------|------|
| Nav Header | white/80 + backdrop-blur | gray-900 |
| Hero | white | gray-900, blue-600 accent |
| Logo Banner | white | gray-400 |
| Features | gray-50 | gray-900 |
| How It Works | white | gray-900, blue-600 numbers |
| Stats | blue-600 | white |
| Testimonials | gray-50 | gray-700 quotes |
| FAQ | white | gray-900 |
| Final CTA | gray-900 | white |
| Footer | white (기존) | gray-500 |

## 9. Dependencies

- **lucide-react** (설치됨): BarChart3, Bell, Lightbulb, Activity, Users, FileText, Key, Eye, TrendingDown, ArrowRight, CheckCircle, Zap, ChevronDown
- **next/link** (내장): CTA 링크
- **tailwindcss** (설치됨): 모든 스타일링
- **추가 패키지 불필요**

## 10. Acceptance Criteria

| # | Criteria | 검증 방법 |
|---|---------|----------|
| AC-01 | 모든 10개 FR이 구현됨 | 각 섹션 시각적 확인 |
| AC-02 | `npm run build` 성공 | 빌드 로그 확인 |
| AC-03 | 반응형 동작 (모바일~데스크탑) | 브라우저 리사이즈 테스트 |
| AC-04 | FAQ accordion 동작 | 클릭 시 열림/닫힘 확인 |
| AC-05 | Nav 앵커 링크 동작 | #features, #faq 스크롤 확인 |
| AC-06 | Footer.tsx 컴포넌트 재사용 | import 확인 |
| AC-07 | 기존 pricing 중복 제거 | page.tsx에 pricing 섹션 없음 |
| AC-08 | SEO metadata 설정 | title, description, OG tags |
| AC-09 | 서버 컴포넌트 유지 (FAQ 제외) | 'use client' 없음 확인 |
| AC-10 | sticky nav header 동작 | 스크롤 시 고정 확인 |
