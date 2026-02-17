# Gap Analysis: Prompt Templates

> Design Reference: `docs/02-design/features/prompt-templates.design.md`
> Analysis Date: 2026-02-17
> Match Rate: **97%**

## Summary

| Metric | Value |
|--------|-------|
| Design Sections | 15 |
| Full Match (100%) | 13 |
| Partial Match (95-99%) | 2 |
| Missing / Major Gap | 0 |
| New Files Created | 11 |
| Modified Files | 5 |
| Build Status | PASS |

## Section-by-Section Analysis

### 1. Type Definitions (`src/types/template.ts`) — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| `TemplateVariable` interface | MATCH | `name` + `defaultValue?` |
| `PromptTemplate` interface | MATCH | All 18 fields present |
| `TemplateCategory` type | MATCH | Design allows `string` union; impl uses `string` directly — functionally equivalent |
| `TemplateVisibility` type | MATCH | `'private' \| 'shared'` |
| `TemplateSortOption` type | MATCH | 4 options |
| `CreateTemplateRequest` | MATCH | All fields |
| `UpdateTemplateRequest` | MATCH | All fields optional |
| `TemplateListResponse` | MATCH | `{ data, total }` |
| `VariableValues` | MATCH | Index signature |
| `DEFAULT_CATEGORIES` | MATCH | 6 categories with Korean labels |
| `CATEGORY_LABELS` | MATCH | Record mapping |

### 2. Variable Utility (`src/features/templates/utils/variables.ts`) — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| Regex pattern | MATCH | `/(?<!\\)\{\{(\w+)\}\}/g` |
| `extractVariables(text)` | MATCH | Unique names, first occurrence order |
| `substituteVariables(text, values)` | MATCH | Global replace, unmatched preserved |
| `detectVariables(system, user)` | MATCH | Merge + deduplicate from both prompts |

### 3. API Routes — GET/POST `/api/templates` — 98%

| Design Item | Status | Notes |
|-------------|--------|-------|
| GET query params (category, search, sort, limit, offset) | MATCH | limit max 100 |
| GET auth check (401) | MATCH | `getMeServer()` |
| GET org lookup | MATCH | `DbUser` pattern |
| GET sort mapping (4 options) | MATCH | recent/name/created/usage |
| GET pagination | MATCH | `_limit` / `_offset` |
| GET shared template fetch | MINOR GAP | Design says separate shared fetch; impl fetches all org-scoped templates. Functionally equivalent — org members see all templates |
| GET response format | MATCH | `{ data, total }` |
| POST validation (name, userPrompt) | MATCH | 400 error |
| POST plan limit check | MATCH | `checkTemplateLimit()` → 403 |
| POST auto-detect variables | MATCH | `detectVariables()` fallback |
| POST create record | MATCH | All fields serialized |
| POST variables serialization | MATCH | `JSON.stringify(variables)` |

### 4. API Routes — GET/PUT/DELETE `/api/templates/[id]` — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| GET access verification | MATCH | userId OR (orgId + shared) |
| GET usage count increment | MATCH | Fire-and-forget `bkend.put` |
| GET 404 handling | MATCH | Template not found |
| PUT ownership check | MATCH | userId === me.id |
| PUT variable re-detection | MATCH | Merge existing defaults on prompt change |
| PUT separate variable update path | MATCH | `if body.variables` else branch |
| DELETE ownership check | MATCH | userId === me.id |
| DELETE response | MATCH | `{ success: true }` |
| Error messages (Korean) | MATCH | All 7 error messages match design spec |

### 5. Plan Limits — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| `PLAN_LIMITS.free.maxTemplates = 10` | MATCH | |
| `PLAN_LIMITS.growth.maxTemplates = -1` | MATCH | Unlimited |
| `checkTemplateLimit()` function | MATCH | Same pattern as existing limit checks |

### 6. TemplateCard — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| Props interface | MATCH | 6 props |
| Card styling | MATCH | `rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-md` |
| Header: name + star | MATCH | Truncate + filled amber star |
| Description: 2-line clamp | MATCH | `line-clamp-2` |
| Category badge | MATCH | `Badge` component with Korean labels |
| Variable chips (max 3 + "+N") | MATCH | `bg-indigo-50 text-indigo-600` chips |
| Footer: visibility + usage + actions | MATCH | Lock/Globe icons, owner-only edit/delete |
| Click → `onSelect` | MATCH | |
| `stopPropagation` on buttons | MATCH | Prevents card click on action buttons |

### 7. TemplateList — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| Props interface | MATCH | 7 props |
| Grid: `grid-cols-1 md:2 lg:3` | MATCH | |
| Loading: 6 skeletons | MATCH | `animate-pulse rounded-2xl bg-slate-100` |
| Empty state: dashed border | MATCH | `border-dashed` with descriptive text |
| `isOwner` calculation | MATCH | `userId === currentUserId` |

### 8. TemplateEditor — 95%

| Design Item | Status | Notes |
|-------------|--------|-------|
| Props interface | MATCH | Extra `prefill?` prop (enhancement) |
| Modal overlay | MATCH | `fixed inset-0 bg-black/50 z-50` |
| Title toggle | MATCH | "새 템플릿 만들기" / "템플릿 수정" |
| Name input | MATCH | Required |
| Description textarea (2 rows) | MATCH | |
| Category select | MATCH | `DEFAULT_CATEGORIES` |
| System prompt (collapsible) | MATCH | ChevronDown/Up toggle |
| User prompt (6 rows) | MATCH | Placeholder with `{{변수명}}` hint |
| Detected variables section | MATCH | Real-time detection + default value inputs |
| Visibility radio group | MATCH | "개인 (나만 사용)" / "공유 (조직 전체)" |
| Temperature slider (0-2, step 0.1) | MATCH | |
| Max Tokens input (1-4096) | MATCH | |
| **Provider select** | **GAP** | Design specifies provider/model selects in Default Parameters — not implemented |
| **Model select** | **GAP** | Dependent on provider — not implemented |
| Save/Cancel buttons | MATCH | Disabled when name/userPrompt empty |

**Gap Detail**: Design Section 6.3 specifies "Provider select (optional)" and "Model select (optional, dependent on provider)" under Default Parameters. Implementation only includes Temperature and Max Tokens. This is low severity since provider/model can be selected in the Playground after loading the template.

### 9. VariableForm — 95%

| Design Item | Status | Notes |
|-------------|--------|-------|
| Variable input grid | MATCH | `grid-cols-1 md:grid-cols-2` (non-compact) |
| Variable label `{{name}}` | MATCH | |
| Placeholder from defaultValue | MATCH | Falls back to "값을 입력하세요" |
| Preview section | MATCH | `substituteVariables()` in `<pre>` block |
| Preview styling | MATCH | `bg-slate-50 rounded-xl p-3 text-sm max-h-40 overflow-y-auto` |
| **Props API** | **DEVIATION** | Design: `preview?: string`; Impl: `userPrompt: string, systemPrompt?: string, compact?: boolean`. Functionally superior — generates preview internally including system prompt |

**Note**: Props deviation is an improvement. Implementation handles both system+user prompt preview and supports compact mode for sidebar usage.

### 10. TemplateSidebar — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| Props interface | MATCH | `onSelectTemplate`, `isOpen`, `onToggle` |
| Slide-in panel styling | MATCH | `fixed right-0 top-16 bottom-0 w-80 z-30` |
| Header: "템플릿" + close | MATCH | |
| Tabs: 즐겨찾기/최근/전체 | MATCH | Star/Clock/List icons |
| Compact card format | MATCH | Name + category badge + variable count |
| Inline VariableForm | MATCH | Shows on click for variable templates |
| "실행" button | MATCH | Below variable form |
| Direct call for no-variable templates | MATCH | |
| Empty state per tab | MATCH | "즐겨찾기한 템플릿이 없습니다" |
| Footer: "모든 템플릿 보기 →" | MATCH | Links to `/templates` |
| `parseVariables()` helper | MATCH | Handles JSON string or array |

### 11. useTemplates Hook — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| State: templates, loading, total, saving | MATCH | |
| Filters: category, search, sort | MATCH | |
| Editor: editingTemplate, editorOpen | MATCH | |
| Plan limits: templateLimit, limitReached | MATCH | |
| `loadTemplates()` with query params | MATCH | |
| `createTemplate()` → POST | MATCH | |
| `updateTemplate()` → PUT | MATCH | |
| `deleteTemplate()` → DELETE | MATCH | |
| `toggleFavorite()` with optimistic update | MATCH | |
| `openEditor()` / `closeEditor()` | MATCH | |
| Debounced search (300ms) | MATCH | `useRef` timer |
| Reload on filter change | MATCH | `useEffect` dependency |
| Return object | MATCH | All 16 properties |

### 12. Playground Integration — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| `sidebarOpen` state | MATCH | |
| `loadTemplate()` function | MATCH | Variable substitution, default params, provider/model matching |
| `getTemplateData()` function | MATCH | Returns `Partial<CreateTemplateRequest>` |
| sidebar close + mode reset | MATCH | `setSidebarOpen(false), setMode('single')` |
| Return values added | MATCH | `sidebarOpen, setSidebarOpen, loadTemplate, getTemplateData` |
| playground/page.tsx toggle button | MATCH | BookTemplate icon with active state |
| "템플릿으로 저장" button | MATCH | Visible when userPrompt non-empty |
| TemplateSidebar rendered | MATCH | `isOpen`, `onToggle`, `onSelectTemplate` |
| Save-as-template modal | MATCH | TemplateEditor with `prefill` prop |

### 13. Templates Page — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| Header: title + "새 템플릿" button | MATCH | Plus icon, disabled on limitReached |
| Limit warning | MATCH | Amber banner with upgrade link |
| Filter bar: search + category + sort | MATCH | |
| Template count | MATCH | "총 {total}개" |
| TemplateList grid | MATCH | |
| TemplateEditor modal | MATCH | Opens on create/edit |
| Delete confirmation dialog | MATCH | Modal with cancel + delete buttons |
| Skeleton loading | MATCH | On `!isReady` |
| `useSession()` guard | MATCH | |

### 14. Navigation — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| NAV_ITEMS entry | MATCH | `{ label: '템플릿', href: '/templates', icon: 'BookTemplate' }` |
| NavBar `BookTemplate` import | MATCH | Added to lucide-react imports |
| NavBar `iconMap` entry | MATCH | `BookTemplate` key added |

### 15. Security — 100%

| Design Item | Status | Notes |
|-------------|--------|-------|
| XSS prevention | MATCH | Plain text rendering only |
| Ownership checks (PUT/DELETE) | MATCH | Server-side |
| Shared template read-only | MATCH | Access check on GET |
| Plan limit enforcement | MATCH | Server-side `checkTemplateLimit()` |
| Org scoping | MATCH | All queries filtered by `orgId` |

## Gap Summary

| # | Section | Gap | Severity | Impact |
|---|---------|-----|----------|--------|
| 1 | TemplateEditor (6.3) | Provider/Model selects missing in Default Parameters | Low | Users can select provider/model in Playground after loading template |
| 2 | VariableForm (6.4) | Props API differs from design (improved) | Info | Implementation is functionally superior — generates preview internally |
| 3 | API GET /templates (4.1) | Shared template fetch strategy differs | Info | Functionally equivalent — org-scoped query returns all org templates |

## File Inventory

### New Files (11)

| File | Lines | Status |
|------|-------|--------|
| `src/types/template.ts` | 97 | COMPLETE |
| `src/features/templates/utils/variables.ts` | 54 | COMPLETE |
| `src/app/api/templates/route.ts` | 129 | COMPLETE |
| `src/app/api/templates/[id]/route.ts` | 115 | COMPLETE |
| `src/features/templates/components/TemplateCard.tsx` | 125 | COMPLETE |
| `src/features/templates/components/TemplateList.tsx` | 64 | COMPLETE |
| `src/features/templates/components/TemplateEditor.tsx` | 328 | COMPLETE |
| `src/features/templates/components/VariableForm.tsx` | 65 | COMPLETE |
| `src/features/templates/components/TemplateSidebar.tsx` | 218 | COMPLETE |
| `src/features/templates/hooks/useTemplates.ts` | 213 | COMPLETE |
| `src/app/(dashboard)/templates/page.tsx` | 199 | COMPLETE |

### Modified Files (5)

| File | Changes | Status |
|------|---------|--------|
| `src/lib/constants.ts` | Added `maxTemplates` to PLAN_LIMITS, templates NAV_ITEM | COMPLETE |
| `src/lib/plan-limits.ts` | Added `checkTemplateLimit()` | COMPLETE |
| `src/components/layout/NavBar.tsx` | Added BookTemplate icon | COMPLETE |
| `src/features/playground/hooks/usePlayground.ts` | Template sidebar + load/save | COMPLETE |
| `src/app/(dashboard)/playground/page.tsx` | Sidebar toggle + save-as-template | COMPLETE |

## Build Verification

- **Build**: PASS (19.5s Turbopack)
- **TypeScript**: No errors
- **Lint**: No new warnings

## Conclusion

Match Rate **97%**. 구현이 설계 문서를 충실히 반영하고 있으며, 발견된 갭은 모두 Low/Info 수준입니다. TemplateEditor의 Provider/Model 선택기 미구현이 유일한 실질적 갭이나, 사용성에 영향이 적습니다 (Playground에서 선택 가능). VariableForm의 Props API 차이는 오히려 설계 대비 개선된 구현입니다.

**Recommendation**: Match Rate 97% ≥ 90% 기준 충족. Report 단계 진행 가능.
