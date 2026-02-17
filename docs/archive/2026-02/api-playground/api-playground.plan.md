# Plan: API Playground

## 1. Feature Overview

**Feature Name**: API Playground
**Description**: 프로바이더별 API 키를 실시간으로 테스트하고, LLM 프롬프트를 직접 실행하여 응답/비용/토큰 사용량을 즉시 확인할 수 있는 인터랙티브 플레이그라운드.

## 2. Background & Motivation

현재 LLM Cost Manager는 API 키 등록 시 `validateKey()`로 유효성만 확인합니다. 사용자가 등록한 키로 실제 프롬프트를 실행하고 응답 품질, 토큰 소비, 비용을 실시간 비교할 수 있는 기능이 없습니다.

**Pain Points**:
- API 키 등록 후 실제로 작동하는지 확인하려면 외부 도구(Postman, curl) 필요
- 모델별 응답 품질과 비용을 비교하려면 각 프로바이더 사이트를 개별 방문
- 프롬프트 최적화 시 토큰 사용량과 비용 변화를 즉시 확인 불가

**Value Proposition**:
- 단일 인터페이스에서 멀티 프로바이더 프롬프트 실행 & 비교
- 실시간 토큰 카운트, 비용 계산, 응답 시간 표시
- 프롬프트 히스토리 저장으로 재사용 & A/B 테스트

## 3. Target Users

- **Primary**: LLM Cost Manager에 API 키를 등록한 사용자 (Free + Growth)
- **Use Cases**:
  - 새 API 키 등록 후 즉시 테스트
  - 동일 프롬프트로 모델 간 비용/품질 비교
  - 프롬프트 엔지니어링 & 최적화
  - 토큰 절감 전략 실험 (shorter prompt, cheaper model)

## 4. Functional Requirements

### FR-01: Prompt Execution Panel
- 프롬프트 입력 영역 (system prompt + user message)
- 프로바이더/모델 선택 드롭다운
- Temperature, Max Tokens 파라미터 조정
- Execute 버튼으로 API 호출 실행
- 실행 중 로딩 인디케이터 (스트리밍 아닌 완료 후 표시)

### FR-02: Response Display
- AI 응답 텍스트 마크다운 렌더링
- 메타데이터 표시: 응답 시간(ms), 입력 토큰, 출력 토큰, 총 비용($)
- 에러 응답 시 에러 메시지 포맷팅

### FR-03: Provider/Model Selector
- 등록된 프로바이더 중 활성 상태만 표시
- 프로바이더별 사용 가능 모델 목록 (adapter.getAvailableModels())
- 모델별 가격 정보 표시 (input/output per 1M tokens)

### FR-04: Parameter Controls
- Temperature: 0.0 ~ 2.0 슬라이더 (default: 1.0)
- Max Tokens: 1 ~ 4096 입력 (default: 1024)
- System Prompt: 선택적 텍스트 영역

### FR-05: Cost Calculator
- 실행 전: 입력 토큰 추정치 & 예상 비용 표시
- 실행 후: 실제 토큰 사용량 & 정확한 비용 표시
- 모델별 가격 테이블 참조 (adapter pricing data)

### FR-06: Execution History
- 최근 실행 기록 리스트 (최대 50건, 로컬 세션 내)
- 각 기록: 프롬프트 요약, 모델, 토큰, 비용, 시간
- 기록 클릭 시 프롬프트/응답 재표시
- DB 저장 (bkend `playground_history` 테이블)

### FR-07: Model Comparison Mode
- 같은 프롬프트를 2개 모델에 동시 실행
- Side-by-side 응답 비교 뷰
- 토큰/비용/응답시간 비교 테이블

### FR-08: Plan-based Access Control
- Free 플랜: 일 10회 실행 제한
- Growth 플랜: 무제한 실행
- 제한 도달 시 업그레이드 안내 표시

## 5. Non-Functional Requirements

### NFR-01: Security
- API 키는 서버사이드에서만 복호화 (`decrypt()`)
- 클라이언트에 API 키 노출 금지
- 프롬프트 실행은 서버 API route를 통해서만 수행

### NFR-02: Performance
- 프롬프트 실행 타임아웃: 60초
- 응답 시간 정확한 측정 (서버 측 `performance.now()`)
- 히스토리 조회 페이지네이션

### NFR-03: Rate Limiting
- 프로바이더별 rate limit 준수 (adapter.rateLimitConfig)
- 429 에러 시 사용자에게 대기 안내 메시지

## 6. Technical Architecture

### 6.1 New Files
| File | Purpose |
|------|---------|
| `src/types/playground.ts` | 타입 정의 |
| `src/app/api/playground/execute/route.ts` | 프롬프트 실행 API |
| `src/app/api/playground/history/route.ts` | 히스토리 CRUD API |
| `src/app/api/playground/estimate/route.ts` | 토큰/비용 추정 API |
| `src/features/playground/components/PlaygroundEditor.tsx` | 프롬프트 입력 영역 |
| `src/features/playground/components/ResponsePanel.tsx` | 응답 표시 패널 |
| `src/features/playground/components/ModelSelector.tsx` | 프로바이더/모델 선택 |
| `src/features/playground/components/ParameterControls.tsx` | 파라미터 슬라이더 |
| `src/features/playground/components/ExecutionHistory.tsx` | 실행 기록 리스트 |
| `src/features/playground/components/ComparisonView.tsx` | 모델 비교 뷰 |
| `src/features/playground/hooks/usePlayground.ts` | 플레이그라운드 상태 훅 |
| `src/app/(dashboard)/playground/page.tsx` | 페이지 컴포넌트 |

### 6.2 Modified Files
| File | Change |
|------|--------|
| `src/lib/plan-limits.ts` | `checkPlaygroundLimit()` 추가 |
| `src/lib/constants.ts` | PLAN_LIMITS에 `playgroundExecutions` 추가 |
| `src/components/layout/NavBar.tsx` | 네비게이션에 Playground 메뉴 추가 |
| `src/services/providers/base-adapter.ts` | `executePrompt()` 메서드 추가 |
| `src/services/providers/openai-adapter.ts` | `executePrompt()` 구현 |
| `src/services/providers/anthropic-adapter.ts` | `executePrompt()` 구현 |
| `src/services/providers/google-adapter.ts` | `executePrompt()` 구현 |

### 6.3 Data Model
```
playground_history {
  id: string (PK)
  orgId: string (FK → organizations)
  userId: string (FK → users)
  provider: string (openai | anthropic | google)
  model: string
  systemPrompt: string?
  userPrompt: string
  response: string
  inputTokens: number
  outputTokens: number
  cost: number
  responseTimeMs: number
  temperature: number
  maxTokens: number
  createdAt: datetime
}
```

### 6.4 API Design

**POST /api/playground/execute**
```json
Request: { providerId, model, systemPrompt?, userPrompt, temperature, maxTokens }
Response: { response, inputTokens, outputTokens, cost, responseTimeMs }
```

**POST /api/playground/estimate**
```json
Request: { provider, model, systemPrompt?, userPrompt }
Response: { estimatedInputTokens, estimatedCost }
```

**GET /api/playground/history?limit=20&offset=0**
```json
Response: { data: PlaygroundHistory[], total: number }
```

## 7. Implementation Order

| Phase | Scope | Files |
|-------|-------|-------|
| Phase 1 | Types & Data Layer | `types/playground.ts`, adapter `executePrompt()` 추가 |
| Phase 2 | API Routes | execute, history, estimate 3개 route |
| Phase 3 | Core UI | PlaygroundEditor, ResponsePanel, ModelSelector, ParameterControls |
| Phase 4 | History & Comparison | ExecutionHistory, ComparisonView, usePlayground hook |
| Phase 5 | Page & Navigation | playground/page.tsx, NavBar 메뉴, plan-limits 연동 |

## 8. Dependencies

- **Existing**: Provider adapters (OpenAI, Anthropic, Google), encryption.service, plan-limits
- **New packages**: 없음 (기존 인프라 활용)
- **External APIs**: OpenAI Chat Completions, Anthropic Messages, Google Gemini GenerateContent

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API 키 클라이언트 노출 | HIGH | 서버사이드 전용 복호화, API route 실행 |
| 프로바이더 rate limit 초과 | MEDIUM | adapter.rateLimitConfig 준수, 429 에러 핸들링 |
| 장시간 응답 (대형 모델) | MEDIUM | 60초 타임아웃, AbortController 적용 |
| 비용 폭주 (무제한 실행) | MEDIUM | Free 일 10회 제한, Growth도 분당 10회 서버 throttle |

## 10. Success Metrics

- API 키 등록 후 플레이그라운드 사용률 > 40%
- 모델 비교 기능 사용률 > 20%
- 플레이그라운드를 통한 프로바이더 추가 전환율 > 15%

## 11. Estimated Scope

- **New Files**: 12
- **Modified Files**: 7
- **Estimated LOC**: ~1,500
- **Complexity**: Medium-High (프로바이더 API 직접 호출, 토큰 추정, 비용 계산)
