# Plan: Landing Page - 전환율 최적화 마케팅 페이지

## 1. Feature Overview

| Item | Description |
|------|-------------|
| Feature | 마케팅 랜딩 페이지 리디자인 |
| Goal | 방문자 → 가입자 전환율 최적화 (Hero, Features, Social Proof, CTA) |
| Priority | High - 고객 유입의 첫 접점 |
| Scope | `app/src/app/page.tsx` 전면 리디자인 + 컴포넌트 분리 |

## 2. Problem Statement

### 현재 상태 (As-Is)
- 98줄짜리 단일 파일 (`page.tsx`)에 모든 섹션 하드코딩
- Hero 섹션: 기본적인 타이틀 + 설명 텍스트만 존재
- Features: 3개만 표시 (Unified Dashboard, Budget Alerts, Cost Optimization)
- Pricing: `/pricing` 페이지와 중복된 간이 pricing 섹션
- Social Proof 없음 (신뢰 요소 부재)
- How It Works 없음 (사용법 설명 부재)
- FAQ 없음 (의문점 해소 수단 부재)
- Footer: `Footer.tsx` 컴포넌트 미사용, 인라인 footer 사용
- 모바일 최적화 미흡

### 목표 상태 (To-Be)
- 섹션별 컴포넌트 분리 → 유지보수성 향상
- 전환율 최적화된 8개 섹션 구성
- 반응형 디자인 (모바일/태블릿/데스크탑)
- Social Proof + Testimonials로 신뢰도 강화
- FAQ로 가입 장벽 해소
- 기존 `Footer.tsx` 컴포넌트 재사용
- 중복 pricing 섹션 제거 → `/pricing` 페이지로 유도

## 3. Functional Requirements

### FR-01: Hero Section 강화
- 강력한 헤드라인 카피 (pain point 직접 공략)
- 서브 헤드라인으로 핵심 가치 전달
- Primary CTA (Start Free) + Secondary CTA (View Demo / Learn More)
- 신뢰 배지: "No credit card required" + "Setup in 2 minutes"
- 대시보드 미리보기 이미지/일러스트 (placeholder)

### FR-02: Social Proof - 로고 배너
- "Trusted by teams at" 섹션
- 6~8개 회사/기술 로고 (placeholder 텍스트 로고)
- 그레이스케일 처리로 세련된 느낌
- 사용자 수 카운터: "1,000+ teams manage their AI costs with us"

### FR-03: Features Showcase 확장
- 6개 주요 기능을 2x3 그리드로 표시
- 각 기능: 아이콘 + 제목 + 설명 + 작은 visual hint
- 기능 목록:
  1. Unified Dashboard - 멀티 프로바이더 통합 뷰
  2. Budget Alerts - 예산 초과 방지 알림
  3. Cost Optimization - AI 기반 비용 절감 추천
  4. Real-time Tracking - 실시간 사용량 모니터링
  5. Team Management - 팀별 비용 배분 관리
  6. Detailed Reports - 프로바이더/모델별 상세 리포트

### FR-04: How It Works 섹션
- 3단계 프로세스 시각화
  1. "Connect" - API 키 등록 (1분)
  2. "Monitor" - 실시간 비용 추적 시작
  3. "Optimize" - AI 추천으로 비용 절감
- 단계별 아이콘 + 연결선 디자인
- 각 단계에 간단한 설명 텍스트

### FR-05: Testimonials 섹션
- 3개 고객 후기 카드
- 각 카드: 인용문 + 이름 + 직책 + 회사명 + 아바타(이니셜)
- placeholder 데이터 사용 (추후 실 고객 데이터로 교체)

### FR-06: Stats/Numbers 섹션
- 핵심 수치 3~4개 표시
  - "$2M+" saved by our users
  - "10,000+" API calls tracked daily
  - "50%+" average cost reduction
  - "3" providers supported
- 큰 숫자 + 설명 텍스트 레이아웃

### FR-07: FAQ 섹션
- 5~6개 자주 묻는 질문
- Accordion(토글) 형태
- 질문 예시:
  - "What providers do you support?"
  - "Is my API key secure?"
  - "Can I try before buying?"
  - "How does billing work?"
  - "What happens if I exceed my budget?"

### FR-08: Final CTA 섹션
- 강력한 마무리 CTA
- 배경색 차별화 (blue gradient 또는 dark)
- "Ready to take control of your AI costs?"
- Primary CTA button + "Free plan available" 텍스트

### FR-09: Navigation Header 개선
- 스크롤 시 sticky header
- 네비게이션 링크: Features, Pricing, FAQ
- 모바일 햄버거 메뉴 (optional - MVP 이후)

### FR-10: Footer 재사용
- 기존 `Footer.tsx` 컴포넌트 import하여 사용
- 현재 인라인 footer 코드 제거

## 4. Non-Functional Requirements

### NFR-01: Performance
- 서버 컴포넌트 유지 (client-side JS 최소화)
- FAQ accordion만 `'use client'` 분리
- 이미지 최적화: next/image 사용 (placeholder)
- Lighthouse Performance 90+ 목표

### NFR-02: SEO
- 시맨틱 HTML (section, article, nav, main)
- 적절한 heading 계층 (h1 → h2 → h3)
- meta description, Open Graph tags

### NFR-03: Accessibility
- 키보드 네비게이션 지원 (FAQ accordion)
- 적절한 aria-label
- 충분한 색상 대비

### NFR-04: Responsive Design
- Mobile-first 접근
- Breakpoints: sm(640px), md(768px), lg(1024px)
- 모든 섹션 모바일에서 단일 컬럼

## 5. Implementation Plan

### 컴포넌트 구조
```
app/src/app/page.tsx                    (메인 - 서버 컴포넌트)
app/src/features/landing/
├── components/
│   ├── HeroSection.tsx                 (서버 컴포넌트)
│   ├── LogoBanner.tsx                  (서버 컴포넌트)
│   ├── FeaturesShowcase.tsx            (서버 컴포넌트)
│   ├── HowItWorks.tsx                  (서버 컴포넌트)
│   ├── Testimonials.tsx                (서버 컴포넌트)
│   ├── StatsSection.tsx                (서버 컴포넌트)
│   ├── FaqSection.tsx                  (클라이언트 컴포넌트)
│   └── FinalCta.tsx                    (서버 컴포넌트)
└── data/
    └── landing-data.ts                 (정적 데이터)
```

### 구현 순서
1. `landing-data.ts` - features, testimonials, faq, stats 데이터 정의
2. `HeroSection.tsx` - Hero 섹션 컴포넌트
3. `LogoBanner.tsx` - Social proof 로고 배너
4. `FeaturesShowcase.tsx` - 6개 기능 그리드
5. `HowItWorks.tsx` - 3단계 프로세스
6. `StatsSection.tsx` - 핵심 수치
7. `Testimonials.tsx` - 고객 후기
8. `FaqSection.tsx` - FAQ accordion (use client)
9. `FinalCta.tsx` - 마무리 CTA
10. `page.tsx` - 메인 페이지 조합 + Navigation header

### 예상 파일 변경
| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/features/landing/data/landing-data.ts` | 정적 데이터 |
| CREATE | `src/features/landing/components/HeroSection.tsx` | Hero 섹션 |
| CREATE | `src/features/landing/components/LogoBanner.tsx` | 로고 배너 |
| CREATE | `src/features/landing/components/FeaturesShowcase.tsx` | 기능 쇼케이스 |
| CREATE | `src/features/landing/components/HowItWorks.tsx` | 사용 방법 |
| CREATE | `src/features/landing/components/StatsSection.tsx` | 핵심 수치 |
| CREATE | `src/features/landing/components/Testimonials.tsx` | 고객 후기 |
| CREATE | `src/features/landing/components/FaqSection.tsx` | FAQ |
| CREATE | `src/features/landing/components/FinalCta.tsx` | 마무리 CTA |
| MODIFY | `src/app/page.tsx` | 전면 리디자인 |

### Dependencies
- lucide-react (이미 설치됨) - 아이콘
- tailwindcss (이미 설치됨) - 스타일링
- 추가 패키지 불필요

## 6. Out of Scope
- 실제 고객 데이터 (placeholder 사용)
- 대시보드 스크린샷/이미지 (placeholder div 사용)
- 모바일 햄버거 메뉴 (Phase 2)
- A/B 테스트 인프라
- 다국어(i18n) 지원
- 블로그/콘텐츠 마케팅 페이지
- 애니메이션/모션 효과 (Phase 2)

## 7. Success Metrics
- 빌드 성공 (zero errors)
- Lighthouse Performance 90+
- 모든 섹션 반응형 동작
- `/pricing` 페이지와 중복 제거
- 기존 Footer 컴포넌트 재사용
