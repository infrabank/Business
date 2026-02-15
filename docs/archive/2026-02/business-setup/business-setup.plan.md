# LLM 비용관리 플랫폼 (LLM Cost Manager) Planning Document

> **Summary**: AI 시대 모든 기업/개인의 LLM API 비용을 통합 관리하고 최적화하는 SaaS 플랫폼
>
> **Project**: AI Gold Rush Essential Service
> **Version**: 0.1.0
> **Author**: Solo Founder
> **Date**: 2026-02-15
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

LLM API 비용이 통제 불가능한 수준으로 증가하고 있는 기업/개인에게 비용 가시성, 최적화 제안, 예산 알림을 제공하여 AI 지출을 30-50% 절감시킨다.

### 1.2 Background

- 기업들이 AI 인프라 예산을 3-5배 초과 지출 중 (2026년 기준)
- OpenAI, Anthropic, Google 등 멀티 프로바이더 사용이 일반화
- 프로바이더별 대시보드가 분산되어 통합 관리 불가
- 토큰 기반 과금 구조가 복잡해 실제 비용 예측 어려움

### 1.3 Related Documents

- Business Vision: [business-vision.md](../business-vision.md)
- Schema: [schema.md](../schema.md)

---

## 2. Scope

### 2.1 In Scope (MVP)

- [x] 멀티 프로바이더 API 키 연동 (OpenAI, Anthropic, Google)
- [x] 실시간 사용량/비용 대시보드
- [x] 팀/프로젝트별 비용 분류
- [x] 일/주/월 비용 리포트
- [x] 예산 초과 알림 (이메일)
- [x] 모델별 비용 비교 및 다운그레이드 추천
- [x] 사용자 인증 (회원가입/로그인)

### 2.2 Out of Scope (Post-MVP)

- 자동 모델 라우팅 (프록시 서버)
- Slack/Teams 연동
- AI 사용량 예측 엔진
- 엔터프라이즈 SSO/SAML
- 온프레미스 배포

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사용자는 이메일로 회원가입/로그인할 수 있다 | High | Pending |
| FR-02 | 사용자는 LLM API 키를 등록/관리할 수 있다 | High | Pending |
| FR-03 | 시스템은 등록된 API 키로 사용량 데이터를 자동 수집한다 | High | Pending |
| FR-04 | 사용자는 통합 비용 대시보드를 볼 수 있다 | High | Pending |
| FR-05 | 사용자는 팀/프로젝트별로 비용을 분류할 수 있다 | Medium | Pending |
| FR-06 | 시스템은 월 예산을 설정하고 초과 시 알림을 보낸다 | High | Pending |
| FR-07 | 시스템은 모델별 비용 비교와 최적화 제안을 제공한다 | Medium | Pending |
| FR-08 | 사용자는 일/주/월 비용 리포트를 CSV로 내보낼 수 있다 | Low | Pending |
| FR-09 | 사용자는 Organization을 생성하고 팀원을 초대할 수 있다 | Medium | Pending |
| FR-10 | 대시보드에 비용 트렌드 차트를 표시한다 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 대시보드 로딩 < 2초 | Lighthouse |
| Security | API 키 AES-256 암호화 저장 | 코드 리뷰 |
| Availability | 99.9% uptime | 모니터링 |
| Scalability | 동시 사용자 1,000명 | 부하 테스트 |
| Responsiveness | 모바일 대응 (320px~) | 브라우저 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 High priority 기능 구현
- [ ] 3개 프로바이더 (OpenAI, Anthropic, Google) API 연동
- [ ] 인증 흐름 완성 (회원가입 → 로그인 → 대시보드)
- [ ] 비용 대시보드 + 차트 동작
- [ ] 예산 알림 이메일 발송

### 4.2 Quality Criteria

- [ ] TypeScript strict 모드 에러 없음
- [ ] Zero lint errors
- [ ] Vercel 빌드 성공
- [ ] 모바일/데스크톱 반응형 동작

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| LLM 프로바이더 API 변경 | High | Medium | 어댑터 패턴으로 프로바이더 레이어 격리 |
| API 키 유출 | High | Low | AES-256 암호화 + 환경변수 분리 |
| 1인 개발로 인한 지연 | Medium | High | MVP 스코프 최소화, AI-Native 개발 |
| 가격 경쟁 (Datadog 등) | Medium | Medium | SMB 집중, 단순/저렴한 가격 |
| 사용량 데이터 수집 제한 | Medium | Medium | 프로바이더별 API 가용성 사전 확인 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS | Web apps with backend, SaaS MVPs | ☑ |
| **Enterprise** | Strict layer separation, microservices | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React / Vue | Next.js 14 (App Router) | SSR + API Routes + 풍부한 생태계 |
| State Management | Context / Zustand / Redux | Zustand | 경량, 간단, 1인 개발 적합 |
| API Client | fetch / axios / react-query | TanStack Query + fetch | 캐싱 + 재시도 자동화 |
| Form Handling | react-hook-form / native | react-hook-form | 유효성 검사 통합 |
| Styling | Tailwind / CSS Modules | Tailwind CSS | 빠른 UI 개발 |
| Charts | Chart.js / Recharts / D3 | Recharts | React 네이티브, 선언적 |
| Testing | Jest / Vitest / Playwright | Vitest + Playwright | 빠른 유닛 + E2E |
| Backend | BaaS / Custom / Serverless | bkend.ai BaaS | 1인 개발, 인증/DB 즉시 사용 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

Folder Structure:
src/
├── app/                    # Next.js App Router pages
├── components/             # 공유 UI 컴포넌트
├── features/               # 기능별 모듈
│   ├── auth/               # 인증
│   ├── dashboard/          # 대시보드
│   ├── providers/          # LLM 프로바이더 관리
│   ├── billing/            # 비용 추적
│   └── alerts/             # 알림
├── services/               # 비즈니스 로직
├── lib/                    # 유틸리티, bkend 클라이언트
└── types/                  # TypeScript 타입 정의
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists (Phase 2)
- [ ] ESLint configuration
- [ ] Prettier configuration
- [ ] TypeScript configuration

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | In CLAUDE.md | camelCase/PascalCase rules | High |
| **Folder structure** | In CLAUDE.md | Feature-based modules | High |
| **Import order** | missing | External → Internal → Relative → Types | Medium |
| **Environment variables** | missing | NEXT_PUBLIC_ prefix rules | Medium |
| **Error handling** | missing | Centralized error handler | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEXT_PUBLIC_APP_URL` | 앱 URL | Client | ☐ |
| `NEXT_PUBLIC_BKEND_URL` | bkend.ai API URL | Client | ☐ |
| `BKEND_API_KEY` | bkend.ai 서버 키 | Server | ☐ |
| `ENCRYPTION_KEY` | API 키 암호화 키 | Server | ☐ |
| `SMTP_HOST` | 이메일 발송 | Server | ☐ |
| `SMTP_USER` | 이메일 계정 | Server | ☐ |
| `SMTP_PASS` | 이메일 비밀번호 | Server | ☐ |

### 7.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | 🔄 | `docs/01-plan/schema.md` | `/phase-1-schema` |
| Phase 2 (Convention) | ⏳ | `docs/01-plan/conventions.md` | `/phase-2-convention` |

---

## 8. Revenue Model

| Plan | Price | Features | Target |
|------|-------|----------|--------|
| Free | $0/월 | 1 프로바이더, 기본 대시보드, 7일 히스토리 | 개인 개발자 |
| Starter | $29/월 | 3 프로바이더, 예산 알림, 30일 히스토리 | 프리랜서/소팀 |
| Pro | $99/월 | 무제한 프로바이더, 팀 관리, 1년 히스토리, CSV 내보내기 | 중소기업 |
| Enterprise | $299/월 | SSO, 감사 로그, 전용 지원, 무제한 히스토리 | 대기업 |

---

## 9. Next Steps

1. [x] Phase 1 Schema 정의 (데이터 모델)
2. [ ] Design 문서 작성 (상세 설계)
3. [ ] Phase 2 Convention 설정 (코딩 규칙)
4. [ ] Phase 3 Mockup (UI/UX 프로토타입)
5. [ ] Implementation 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-15 | Initial draft - LLM 비용관리 플랫폼 확정 | Solo Founder |
