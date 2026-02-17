# Plan: Onboarding Flow

> Feature: onboarding-flow
> Created: 2026-02-17
> Status: **DRAFT**

## 1. Feature Overview

신규 사용자가 회원가입 후 처음 대시보드에 도착했을 때, 프로바이더 등록 → API 키 입력 → 첫 동기화까지 자연스럽게 안내하는 온보딩 위자드 기능.

### 1.1 Background (현재 상태)

- **회원가입**: 이름/이메일/비밀번호 입력 → 즉시 `/dashboard`로 리다이렉트
- **문제점**: 대시보드에 도착하면 프로바이더 없이 빈 대시보드 노출. 사용자가 무엇을 해야 하는지 안내 없음
- **조직 자동 생성**: `useAuth.initSession()`에서 org가 없으면 자동 생성 (이미 구현됨)
- **프로바이더 등록**: `/providers` 페이지에서 수동으로 추가해야 함 (별도 페이지)
- **첫 사용자 이탈 위험**: 가치를 경험하기 전에 이탈할 가능성이 높음

### 1.2 Goal

- 신규 사용자가 **3분 이내**에 첫 프로바이더를 등록하고 첫 데이터 동기화까지 완료
- 온보딩 완료율 **80% 이상** 목표 (첫 프로바이더 등록 기준)
- 기존 사용자에게는 온보딩을 표시하지 않음

## 2. Functional Requirements

### FR-01: 온보딩 상태 감지
- 사용자의 온보딩 완료 여부를 `users` 테이블의 `onboardingCompleted` 필드로 관리
- 대시보드 접근 시 `onboardingCompleted === false`이면 온보딩 위자드 표시
- 온보딩 완료 또는 건너뛰기 시 `onboardingCompleted = true`로 업데이트

### FR-02: 환영 단계 (Step 1 - Welcome)
- 서비스 소개 + 핵심 가치 제안 (비용 절감, 통합 관리)
- 온보딩 예상 소요 시간 안내 ("약 2분")
- "시작하기" 버튼 → Step 2로 이동
- "나중에 하기" 링크 → 온보딩 스킵, 대시보드로 이동

### FR-03: 프로바이더 선택 단계 (Step 2 - Provider)
- OpenAI / Anthropic / Google 중 하나 선택 (카드 UI)
- 각 프로바이더 로고 + 간단한 설명
- 선택 시 해당 프로바이더의 API 키 입력 필드 노출
- "여러 프로바이더를 나중에 추가할 수 있습니다" 안내 문구

### FR-04: API 키 입력 단계 (Step 3 - API Key)
- 선택한 프로바이더의 API 키 입력 폼
- API 키 발급 가이드 링크 (각 프로바이더별)
  - OpenAI: https://platform.openai.com/api-keys
  - Anthropic: https://console.anthropic.com/settings/keys
  - Google: https://aistudio.google.com/apikey
- 입력 후 "키 검증" 버튼 → 서버에서 실제 API 호출로 유효성 확인
- 유효하면 프로바이더 자동 등록 (기존 `addProvider` 로직 재사용)
- 실패 시 에러 메시지 + 재시도 안내

### FR-05: 첫 동기화 단계 (Step 4 - Sync)
- 프로바이더 등록 성공 후 자동으로 첫 사용량 데이터 동기화 시작
- 동기화 진행 상태 표시 (프로그레스 바 또는 스피너)
- 동기화 완료 시 간단한 요약 표시 (총 비용, 요청 수 등)
- 데이터가 없는 경우(신규 계정): "아직 API 사용 이력이 없습니다" 안내

### FR-06: 완료 단계 (Step 5 - Complete)
- 축하 메시지 + 설정 완료 요약
- 주요 기능 소개 카드 (예산 설정, 알림 설정, 리포트)
- "대시보드로 이동" 버튼 → 온보딩 완료 처리 + 대시보드 이동
- Confetti 애니메이션 (선택적)

### FR-07: 온보딩 스킵 & 재시작
- 모든 단계에서 "건너뛰기" 옵션 제공
- 건너뛰기 시 `onboardingCompleted = true` → 다시 표시하지 않음
- 설정 페이지에서 "온보딩 다시 시작" 버튼 → `onboardingCompleted = false`로 리셋

### FR-08: 온보딩 프로그레스 바
- 화면 상단에 현재 단계 표시 (1/5, 2/5, ...)
- 스텝 인디케이터: 완료(체크) / 현재(활성) / 미완료(비활성)
- 이전 단계로 돌아가기 가능 (Back 버튼)

## 3. Non-Functional Requirements

| NFR | Description |
|-----|-------------|
| NFR-01 | 온보딩 위자드는 3초 이내에 초기 로딩 완료 |
| NFR-02 | 모바일 반응형 지원 (최소 360px) |
| NFR-03 | API 키 검증은 5초 이내 타임아웃 |
| NFR-04 | 온보딩 상태는 서버에 영구 저장 (브라우저 종료 후에도 유지) |
| NFR-05 | 접근성 (키보드 네비게이션, ARIA 라벨) |

## 4. Technical Architecture

### 4.1 데이터 모델 변경

```
users 테이블 추가 필드:
- onboardingCompleted: boolean (default: false)
- onboardingStep: number (현재 단계, 1-5, 중단 시 복원용)
```

### 4.2 신규 파일

| File | Purpose |
|------|---------|
| `src/features/onboarding/components/OnboardingWizard.tsx` | 메인 위자드 컨테이너 (스텝 관리) |
| `src/features/onboarding/components/WelcomeStep.tsx` | Step 1: 환영 |
| `src/features/onboarding/components/ProviderStep.tsx` | Step 2: 프로바이더 선택 |
| `src/features/onboarding/components/ApiKeyStep.tsx` | Step 3: API 키 입력 + 검증 |
| `src/features/onboarding/components/SyncStep.tsx` | Step 4: 첫 동기화 |
| `src/features/onboarding/components/CompleteStep.tsx` | Step 5: 완료 |
| `src/features/onboarding/components/StepIndicator.tsx` | 프로그레스 바 / 스텝 인디케이터 |
| `src/features/onboarding/hooks/useOnboarding.ts` | 온보딩 상태 관리 훅 |
| `src/app/api/onboarding/route.ts` | GET (상태 조회) + PUT (상태 업데이트) API |
| `src/app/api/onboarding/validate-key/route.ts` | POST: API 키 유효성 검증 |

### 4.3 수정 파일

| File | Changes |
|------|---------|
| `src/app/(dashboard)/dashboard/page.tsx` | 온보딩 미완료 시 위자드 표시 로직 추가 |
| `src/features/auth/hooks/useAuth.ts` | signup 후 `onboardingCompleted: false` 초기값 설정 |
| `src/app/(dashboard)/settings/page.tsx` | "온보딩 다시 시작" 버튼 추가 |

### 4.4 기존 코드 재사용

| Component/Service | 재사용 방식 |
|-------------------|-------------|
| `useProviders.addProvider()` | Step 3에서 프로바이더 등록 시 재사용 |
| `ProviderForm` 컴포넌트 일부 | API 키 입력 UI 참고 |
| `usage-sync` 서비스 | Step 4에서 첫 동기화 트리거 |
| `PROVIDER_COLORS`, `PROVIDER_LABELS` | 프로바이더 카드 UI에 재사용 |

### 4.5 API 키 검증 로직

```
POST /api/onboarding/validate-key
Body: { type: 'openai' | 'anthropic' | 'google', apiKey: string }

Process:
1. 각 프로바이더별 최소 API 호출 (models list 등)
2. 성공 → { valid: true }
3. 실패 → { valid: false, error: '...' }
4. 타임아웃 5초
```

## 5. Implementation Order

| Phase | Files | Description |
|-------|-------|-------------|
| Phase 1 | API routes (2) | `onboarding/route.ts`, `validate-key/route.ts` |
| Phase 2 | Hook (1) | `useOnboarding.ts` - 상태 관리 |
| Phase 3 | UI Components (7) | 위자드 + 5개 스텝 + 인디케이터 |
| Phase 4 | Integration (3) | dashboard, useAuth, settings 수정 |
| Phase 5 | Testing & Polish | 반응형, 에러 처리, 엣지 케이스 |

## 6. Out of Scope

- 이메일 인증 플로우 (별도 기능)
- 소셜 로그인 (Google, GitHub) 연동
- 다국어 지원 (현재 한국어 단일)
- 온보딩 A/B 테스트
- 사용자 행동 분석 (analytics event tracking)

## 7. Risk & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API 키 검증 시 외부 API 장애 | Medium | High | 타임아웃 + "나중에 검증" 옵션 제공 |
| 사용자가 API 키를 모르는 경우 | High | Medium | 각 프로바이더별 키 발급 가이드 링크 제공 |
| 동기화 시 데이터 없음 (신규 계정) | High | Low | 빈 상태 안내 메시지 + "괜찮습니다" 설명 |
| 온보딩 중 브라우저 종료 | Medium | Low | `onboardingStep` 저장으로 복원 |

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| 온보딩 시작률 (회원가입 → Step 1) | 95% |
| 온보딩 완료율 (Step 1 → Step 5) | 80% |
| 프로바이더 등록률 (Step 3 완료) | 85% |
| 평균 온보딩 소요 시간 | < 3분 |
| 첫 동기화 성공률 | 90% |
