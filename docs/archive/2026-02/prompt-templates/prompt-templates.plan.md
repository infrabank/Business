# Plan: Prompt Templates

## 1. Feature Overview

**Feature Name**: Prompt Templates
**Description**: 프롬프트 템플릿 라이브러리 — 자주 사용하는 프롬프트를 저장, 카테고리 분류, 공유하고 API Playground에서 즉시 불러와 실행할 수 있는 기능.

## 2. Background & Motivation

API Playground가 구현되어 프롬프트를 실행하고 비용을 비교할 수 있지만, 매번 프롬프트를 처음부터 작성해야 합니다. 반복적으로 사용하는 프롬프트(번역, 요약, 코드 리뷰 등)를 템플릿으로 저장하면 생산성이 크게 향상됩니다.

**Pain Points**:
- 자주 사용하는 프롬프트를 매번 다시 입력해야 함
- 팀 내에서 효과적인 프롬프트를 공유할 방법이 없음
- 프롬프트 변수(예: `{{language}}`, `{{text}}`)를 활용한 템플릿 재사용 불가

**Value Proposition**:
- 프롬프트 템플릿 저장 & 카테고리별 관리
- 변수 치환 (`{{variable}}`) 으로 동적 프롬프트 생성
- Playground 연동으로 원클릭 실행
- 조직 내 템플릿 공유

## 3. Target Users

- **Primary**: API Playground를 활발히 사용하는 사용자
- **Use Cases**:
  - 번역, 요약, 코드 리뷰 등 반복 프롬프트 템플릿화
  - 팀원과 효과적인 프롬프트 공유
  - 변수를 활용한 동적 프롬프트 생성
  - 프롬프트 A/B 테스트 (템플릿 버전 관리)

## 4. Functional Requirements

### FR-01: Template CRUD
- 프롬프트 템플릿 생성/수정/삭제
- 템플릿 구성: 이름, 설명, 카테고리, 시스템 프롬프트, 유저 프롬프트, 변수 목록, 기본 모델/파라미터
- 변수는 `{{variableName}}` 형식으로 프롬프트 내에서 자동 감지

### FR-02: Category Management
- 기본 카테고리: 번역, 요약, 코드, 분석, 마케팅, 기타
- 커스텀 카테고리 생성 가능
- 카테고리별 필터링 & 검색

### FR-03: Variable System
- 프롬프트 내 `{{변수명}}` 패턴 자동 감지
- 변수별 기본값 설정 가능
- 실행 시 변수 입력 폼 자동 생성
- 변수 치환 후 최종 프롬프트 미리보기

### FR-04: Playground Integration
- 템플릿 목록에서 "Playground에서 실행" 버튼
- Playground에서 "템플릿으로 저장" 버튼
- 템플릿 선택 시 시스템 프롬프트 + 유저 프롬프트 + 파라미터 자동 채움
- 변수가 있으면 입력 폼 표시 후 치환

### FR-05: Template List & Search
- 전체 템플릿 목록 (카드 그리드 or 리스트 뷰)
- 이름/설명 검색
- 카테고리 필터
- 최근 사용순, 이름순, 생성순 정렬
- 사용 횟수 표시

### FR-06: Template Sharing (Organization)
- 템플릿 공개 범위: 개인(private) / 조직(shared)
- 조직 공유 시 모든 멤버가 사용 가능
- 원본 작성자 표시

### FR-07: Quick Use (Sidebar)
- Playground 페이지 내 사이드바에 최근/즐겨찾기 템플릿
- 즐겨찾기(별표) 기능
- 사이드바에서 바로 변수 입력 & 실행

### FR-08: Plan-based Limits
- Free 플랜: 최대 10개 템플릿
- Growth 플랜: 무제한 템플릿
- 제한 도달 시 업그레이드 안내

## 5. Non-Functional Requirements

### NFR-01: Performance
- 템플릿 목록 로딩 < 500ms
- 변수 감지 실시간 (입력 중 즉시)

### NFR-02: Data Integrity
- 템플릿 삭제 시 확인 다이얼로그
- 조직 공유 템플릿은 작성자만 수정/삭제 가능

## 6. Technical Architecture

### 6.1 New Files
| File | Purpose |
|------|---------|
| `src/types/template.ts` | 타입 정의 |
| `src/app/api/templates/route.ts` | 템플릿 CRUD API (GET, POST) |
| `src/app/api/templates/[id]/route.ts` | 개별 템플릿 API (GET, PUT, DELETE) |
| `src/features/templates/components/TemplateList.tsx` | 템플릿 목록 (카드 그리드) |
| `src/features/templates/components/TemplateCard.tsx` | 템플릿 카드 |
| `src/features/templates/components/TemplateEditor.tsx` | 템플릿 생성/수정 폼 |
| `src/features/templates/components/VariableForm.tsx` | 변수 입력 폼 |
| `src/features/templates/components/TemplateSidebar.tsx` | Playground 사이드바 |
| `src/features/templates/hooks/useTemplates.ts` | 템플릿 상태 훅 |
| `src/features/templates/utils/variables.ts` | 변수 감지 & 치환 유틸 |
| `src/app/(dashboard)/templates/page.tsx` | 템플릿 페이지 |

### 6.2 Modified Files
| File | Change |
|------|--------|
| `src/lib/constants.ts` | PLAN_LIMITS에 `maxTemplates` 추가, NAV_ITEMS에 템플릿 메뉴 |
| `src/lib/plan-limits.ts` | `checkTemplateLimit()` 추가 |
| `src/components/layout/NavBar.tsx` | BookTemplate 아이콘 추가 |
| `src/app/(dashboard)/playground/page.tsx` | TemplateSidebar 연동 |
| `src/features/playground/hooks/usePlayground.ts` | 템플릿 로드/저장 기능 추가 |

### 6.3 Data Model
```
prompt_templates {
  id: string (PK)
  orgId: string (FK → organizations)
  userId: string (FK → users, 작성자)
  name: string
  description: string?
  category: string (default: 'other')
  systemPrompt: string?
  userPrompt: string
  variables: JSON (Array<{ name: string, defaultValue?: string }>)
  defaultModel: string?
  defaultProvider: string?
  defaultTemperature: number?
  defaultMaxTokens: number?
  visibility: string ('private' | 'shared')
  isFavorite: boolean (default: false)
  usageCount: number (default: 0)
  createdAt: datetime
  updatedAt: datetime
}
```

### 6.4 API Design

**GET /api/templates?category=&search=&sort=recent&limit=50&offset=0**
```json
Response: { data: PromptTemplate[], total: number }
```

**POST /api/templates**
```json
Request: { name, description?, category, systemPrompt?, userPrompt, variables?, defaultModel?, defaultProvider?, defaultTemperature?, defaultMaxTokens?, visibility }
Response: PromptTemplate
```

**GET /api/templates/:id**
```json
Response: PromptTemplate
```

**PUT /api/templates/:id**
```json
Request: { name?, description?, category?, systemPrompt?, userPrompt?, variables?, ... }
Response: PromptTemplate
```

**DELETE /api/templates/:id**
```json
Response: { success: true }
```

## 7. Implementation Order

| Phase | Scope | Files |
|-------|-------|-------|
| Phase 1 | Types & Utils | `types/template.ts`, `utils/variables.ts` |
| Phase 2 | API Routes | `api/templates/route.ts`, `api/templates/[id]/route.ts`, `plan-limits.ts`, `constants.ts` |
| Phase 3 | Core UI | `TemplateList.tsx`, `TemplateCard.tsx`, `TemplateEditor.tsx`, `VariableForm.tsx` |
| Phase 4 | Playground Integration | `TemplateSidebar.tsx`, `usePlayground.ts` 수정, `useTemplates.ts` |
| Phase 5 | Page & Navigation | `templates/page.tsx`, `NavBar.tsx`, `playground/page.tsx` 수정 |

## 8. Dependencies

- **Existing**: API Playground (프롬프트 실행), bkend (DB 저장), plan-limits (접근 제어)
- **New packages**: 없음
- **Data**: `prompt_templates` 테이블 (bkend)

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 변수 구문 충돌 (실제 {{ }} 사용) | MEDIUM | `{{` 이스케이프 지원 (`\{\{`) |
| 대량 템플릿 로딩 성능 | LOW | 페이지네이션 + 검색 필터 |
| 공유 템플릿 무단 수정 | MEDIUM | 작성자만 수정/삭제, 다른 멤버는 복제 |
| XSS via 템플릿 내용 | LOW | 프롬프트는 plain text 렌더링 |

## 10. Success Metrics

- Playground 사용자 중 템플릿 생성률 > 30%
- 템플릿 재사용률 (평균 3회 이상 사용) > 50%
- 조직 공유 템플릿 활용률 > 20%

## 11. Estimated Scope

- **New Files**: 11
- **Modified Files**: 5
- **Estimated LOC**: ~1,500
- **Complexity**: Medium (변수 시스템, Playground 연동, CRUD)
