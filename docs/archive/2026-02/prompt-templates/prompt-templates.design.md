# Design: Prompt Templates

> Plan Reference: `docs/01-plan/features/prompt-templates.plan.md`
> Design Date: 2026-02-17

## 1. Overview

프롬프트 템플릿 라이브러리 — 자주 사용하는 프롬프트를 저장, 카테고리 분류, 공유하고 API Playground에서 즉시 불러와 실행할 수 있는 기능.

### Scope

| Metric | Value |
|--------|-------|
| New Files | 11 |
| Modified Files | 5 |
| Estimated LOC | ~1,500 |
| Complexity | Medium |

## 2. Type Definitions

### File: `src/types/template.ts`

```typescript
// === Template Variable ===

export interface TemplateVariable {
  name: string
  defaultValue?: string
}

// === Template Core ===

export interface PromptTemplate {
  id: string
  orgId: string
  userId: string
  name: string
  description?: string
  category: TemplateCategory
  systemPrompt?: string
  userPrompt: string
  variables: TemplateVariable[]
  defaultModel?: string
  defaultProvider?: string
  defaultTemperature?: number
  defaultMaxTokens?: number
  visibility: TemplateVisibility
  isFavorite: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

// === Enums ===

export type TemplateCategory =
  | 'translation'
  | 'summary'
  | 'code'
  | 'analysis'
  | 'marketing'
  | 'other'
  | string  // custom categories

export type TemplateVisibility = 'private' | 'shared'

export type TemplateSortOption = 'recent' | 'name' | 'created' | 'usage'

// === API Request/Response ===

export interface CreateTemplateRequest {
  name: string
  description?: string
  category: string
  systemPrompt?: string
  userPrompt: string
  variables?: TemplateVariable[]
  defaultModel?: string
  defaultProvider?: string
  defaultTemperature?: number
  defaultMaxTokens?: number
  visibility: TemplateVisibility
}

export interface UpdateTemplateRequest {
  name?: string
  description?: string
  category?: string
  systemPrompt?: string
  userPrompt?: string
  variables?: TemplateVariable[]
  defaultModel?: string
  defaultProvider?: string
  defaultTemperature?: number
  defaultMaxTokens?: number
  visibility?: TemplateVisibility
  isFavorite?: boolean
}

export interface TemplateListResponse {
  data: PromptTemplate[]
  total: number
}

// === Variable Substitution ===

export interface VariableValues {
  [variableName: string]: string
}
```

## 3. Variable Utility

### File: `src/features/templates/utils/variables.ts`

```typescript
/**
 * Extract variable names from template text.
 * Pattern: {{variableName}}
 * Escaped: \{\{ is ignored
 */
export function extractVariables(text: string): string[]

/**
 * Substitute variables in template text.
 * Replaces {{varName}} with corresponding value.
 * Unmatched variables remain as-is.
 */
export function substituteVariables(text: string, values: VariableValues): string

/**
 * Generate TemplateVariable[] from system + user prompts.
 * Merges variables from both, deduplicates by name.
 */
export function detectVariables(
  systemPrompt: string | undefined,
  userPrompt: string
): TemplateVariable[]
```

#### Implementation Details

- **Regex Pattern**: `/(?<!\\)\{\{(\w+)\}\}/g`
  - Matches `{{variableName}}` where variableName is `\w+`
  - Negative lookbehind `(?<!\\)` excludes escaped `\{\{`
- **extractVariables**: Returns unique variable names in order of first occurrence
- **substituteVariables**: Global replace, returns final string
- **detectVariables**: Calls `extractVariables` on both prompts, deduplicates, returns `TemplateVariable[]` with empty `defaultValue`

## 4. API Routes

### 4.1 GET/POST `/api/templates/route.ts`

#### GET `/api/templates`

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| category | string | (all) | Filter by category |
| search | string | (none) | Search name/description |
| sort | TemplateSortOption | 'recent' | Sort order |
| limit | string | '50' | Page size (max 100) |
| offset | string | '0' | Pagination offset |

**Flow**:
1. `getMeServer()` — 401 if unauthenticated
2. Load user's organization
3. Build bkend query params:
   - `orgId` filter
   - `category` filter (if provided)
   - `q` search (if provided, searches name + description)
   - `_sort` / `_order` based on sort param
   - `_limit` / `_offset` for pagination
4. Also fetch shared templates from organization (visibility: 'shared') if user has orgId
5. Return `{ data: PromptTemplate[], total: number }`

**Sort Mapping**:

| Sort Option | `_sort` | `_order` |
|-------------|---------|----------|
| recent | updatedAt | desc |
| name | name | asc |
| created | createdAt | desc |
| usage | usageCount | desc |

**Error Responses**:
- 401: Unauthorized
- 500: Server error

#### POST `/api/templates`

**Request Body**: `CreateTemplateRequest`

**Flow**:
1. `getMeServer()` — 401 if unauthenticated
2. Validate required fields: `name`, `userPrompt`
3. `checkTemplateLimit(plan, currentCount)` — 403 if limit reached
4. Auto-detect variables from systemPrompt + userPrompt if not provided
5. `bkend.post('prompt_templates', { ...body, orgId, userId })` — create record
6. Return created `PromptTemplate` with 201 status

**Error Responses**:
- 400: Missing required fields (name, userPrompt)
- 401: Unauthorized
- 403: Template limit reached (include `planRequired: 'growth'`)
- 500: Server error

### 4.2 GET/PUT/DELETE `/api/templates/[id]/route.ts`

#### GET `/api/templates/:id`

**Flow**:
1. `getMeServer()` — 401
2. `bkend.get('prompt_templates', id)` — 404 if not found
3. Verify access: `userId === me.id` OR `(orgId matches AND visibility === 'shared')`
4. Increment `usageCount` (fire-and-forget `bkend.put`)
5. Return `PromptTemplate`

**Error Responses**:
- 401: Unauthorized
- 403: No access to this template
- 404: Template not found

#### PUT `/api/templates/:id`

**Request Body**: `UpdateTemplateRequest`

**Flow**:
1. `getMeServer()` — 401
2. `bkend.get('prompt_templates', id)` — 404
3. Verify ownership: `userId === me.id` — 403 if not owner
4. If `userPrompt` or `systemPrompt` changed, re-detect variables (merge with existing defaults)
5. `bkend.put('prompt_templates', id, updates)` — update
6. Return updated `PromptTemplate`

**Error Responses**:
- 401: Unauthorized
- 403: Not the template owner
- 404: Template not found
- 500: Server error

#### DELETE `/api/templates/:id`

**Flow**:
1. `getMeServer()` — 401
2. `bkend.get('prompt_templates', id)` — 404
3. Verify ownership: `userId === me.id` — 403
4. `bkend.delete('prompt_templates', id)`
5. Return `{ success: true }`

**Error Responses**:
- 401: Unauthorized
- 403: Not the template owner
- 404: Template not found
- 500: Server error

## 5. Plan Limits

### Modified: `src/lib/constants.ts`

```typescript
export const PLAN_LIMITS = {
  free: { providers: 1, historyDays: 7, members: 1, maxRequests: 1000, playgroundDaily: 10, maxTemplates: 10 },
  growth: { providers: -1, historyDays: 365, members: -1, maxRequests: -1, playgroundDaily: -1, maxTemplates: -1 },
} as const
```

### Modified: `src/lib/plan-limits.ts`

```typescript
export function checkTemplateLimit(plan: UserPlan, currentCount: number): PlanLimitCheck {
  const limit = PLAN_LIMITS[plan].maxTemplates as number
  if (isUnlimited(limit)) return { allowed: true, current: currentCount, limit: -1 }
  const allowed = currentCount < limit
  return {
    allowed,
    current: currentCount,
    limit,
    planRequired: allowed ? undefined : 'growth',
  }
}
```

## 6. UI Components

### 6.1 TemplateList (`src/features/templates/components/TemplateList.tsx`)

**Props**:
```typescript
interface TemplateListProps {
  templates: PromptTemplate[]
  loading: boolean
  onSelect: (template: PromptTemplate) => void
  onEdit: (template: PromptTemplate) => void
  onDelete: (template: PromptTemplate) => void
  onToggleFavorite: (template: PromptTemplate) => void
  currentUserId: string
}
```

**Layout**:
- Responsive card grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Each card rendered by `TemplateCard`
- Empty state: dashed border, "템플릿이 없습니다. 새 템플릿을 만들어보세요." with create CTA
- Loading: 6 skeleton cards (pulse animation)

### 6.2 TemplateCard (`src/features/templates/components/TemplateCard.tsx`)

**Props**:
```typescript
interface TemplateCardProps {
  template: PromptTemplate
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  isOwner: boolean
}
```

**Design**:
- `rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer`
- **Header row**: Name (font-semibold truncate) + Favorite star (Star icon, filled yellow if `isFavorite`)
- **Description**: 2-line clamp, text-sm text-slate-500
- **Category badge**: `Badge` component, category label (Korean mapped)
- **Variable chips**: If variables exist, show first 3 as small `bg-indigo-50 text-indigo-600 text-xs rounded-full px-2 py-0.5` chips with `{{name}}` format. Show "+N" if more.
- **Footer row**:
  - Left: Visibility icon (Lock for private, Globe for shared) + usage count (`사용 {n}회`)
  - Right: Action buttons (Edit pencil, Delete trash) — only if `isOwner`
- **Click**: calls `onSelect` (opens in Playground)

**Category Labels (Korean)**:
```typescript
const CATEGORY_LABELS: Record<string, string> = {
  translation: '번역',
  summary: '요약',
  code: '코드',
  analysis: '분석',
  marketing: '마케팅',
  other: '기타',
}
```

### 6.3 TemplateEditor (`src/features/templates/components/TemplateEditor.tsx`)

**Props**:
```typescript
interface TemplateEditorProps {
  template?: PromptTemplate  // undefined = create mode
  onSave: (data: CreateTemplateRequest | UpdateTemplateRequest) => Promise<void>
  onCancel: () => void
  saving: boolean
}
```

**Layout** (Modal or slide-over):
- **Title**: "새 템플릿 만들기" / "템플릿 수정"
- **Name input**: `<Input>` required, placeholder "템플릿 이름"
- **Description textarea**: 2 rows, optional, placeholder "템플릿 설명 (선택사항)"
- **Category select**: `<select>` with default categories + custom input option
- **System Prompt textarea**: 4 rows, optional, collapsible (ChevronDown/Up), placeholder "시스템 프롬프트 (선택사항)"
- **User Prompt textarea**: 6 rows, required, placeholder "유저 프롬프트 — {{변수명}} 형식으로 변수를 사용할 수 있습니다"
- **Detected Variables section**: Real-time display of detected `{{variables}}` from both prompt fields
  - Each variable shown with name + optional default value input
  - Auto-updates as user types (no debounce needed, regex is fast)
- **Visibility toggle**: Radio group — "개인 (나만 사용)" / "공유 (조직 전체)"
- **Default Parameters** (collapsible section):
  - Provider select (optional)
  - Model select (optional, dependent on provider)
  - Temperature slider (0-2, step 0.1)
  - Max Tokens input (1-4096)
- **Actions**: Cancel (secondary button) + Save (primary button, disabled if name/userPrompt empty)

**Variable Detection**:
- On every change to systemPrompt or userPrompt, call `detectVariables()`
- Display detected variables below the prompt fields
- Each variable shows an input for `defaultValue`

### 6.4 VariableForm (`src/features/templates/components/VariableForm.tsx`)

**Props**:
```typescript
interface VariableFormProps {
  variables: TemplateVariable[]
  values: VariableValues
  onChange: (values: VariableValues) => void
  preview?: string  // substituted prompt preview
}
```

**Layout**:
- Grid of variable inputs: `grid-cols-1 md:grid-cols-2 gap-3`
- Each variable: label (`{{name}}`) + `<Input>` with placeholder from `defaultValue` or "값을 입력하세요"
- **Preview section**: "최종 프롬프트 미리보기" — shows `substituteVariables()` result in `<pre>` block with `bg-slate-50 rounded-xl p-3 text-sm max-h-40 overflow-y-auto`
- Preview updates in real-time as values change

### 6.5 TemplateSidebar (`src/features/templates/components/TemplateSidebar.tsx`)

**Props**:
```typescript
interface TemplateSidebarProps {
  onSelectTemplate: (template: PromptTemplate, values: VariableValues) => void
  isOpen: boolean
  onToggle: () => void
}
```

**Layout**:
- Slide-in panel from right: `fixed right-0 top-16 bottom-0 w-80 bg-white border-l shadow-xl z-30 transition-transform`
- **Toggle button**: `BookTemplate` icon button on playground page, shows/hides sidebar
- **Header**: "템플릿" + close button (X)
- **Tabs**: "즐겨찾기" / "최근 사용" / "전체" (compact tab row)
- **Template list**: Compact card format
  - Name (truncate), category badge (small), variable count
  - Click → if variables exist, show inline `VariableForm` below the card
  - "실행" button below variable form → calls `onSelectTemplate` with substituted values
  - If no variables, click directly calls `onSelectTemplate`
- **Empty state**: "즐겨찾기한 템플릿이 없습니다" per tab
- **Footer link**: "모든 템플릿 보기 →" links to `/templates`

### 6.6 Category Labels Constant

Defined in `TemplateCard.tsx` or extracted to a shared constant:

```typescript
export const DEFAULT_CATEGORIES = [
  { value: 'translation', label: '번역' },
  { value: 'summary', label: '요약' },
  { value: 'code', label: '코드' },
  { value: 'analysis', label: '분석' },
  { value: 'marketing', label: '마케팅' },
  { value: 'other', label: '기타' },
] as const
```

## 7. Custom Hook

### File: `src/features/templates/hooks/useTemplates.ts`

```typescript
export function useTemplates() {
  // State
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [saving, setSaving] = useState(false)

  // Filters
  const [category, setCategory] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<TemplateSortOption>('recent')

  // Editor state
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  // Plan limits
  const plan = currentUser?.plan || 'free'
  const templateLimit = plan === 'growth' ? -1 : 10
  const limitReached = templateLimit !== -1 && templates.length >= templateLimit

  // Load templates
  async function loadTemplates(): Promise<void>

  // CRUD
  async function createTemplate(data: CreateTemplateRequest): Promise<PromptTemplate>
  async function updateTemplate(id: string, data: UpdateTemplateRequest): Promise<PromptTemplate>
  async function deleteTemplate(id: string): Promise<void>

  // Actions
  async function toggleFavorite(template: PromptTemplate): Promise<void>

  // Editor helpers
  function openEditor(template?: PromptTemplate): void  // undefined = create mode
  function closeEditor(): void

  return {
    // Data
    templates, loading, total,
    // Filters
    category, setCategory, search, setSearch, sort, setSort,
    // Editor
    editingTemplate, editorOpen, saving,
    openEditor, closeEditor,
    // CRUD
    createTemplate, updateTemplate, deleteTemplate, toggleFavorite,
    // Limits
    templateLimit, limitReached,
    // Reload
    loadTemplates,
  }
}
```

**API Calls**:
- `loadTemplates()`: `GET /api/templates?category=&search=&sort=&limit=50&offset=0`
- `createTemplate()`: `POST /api/templates`
- `updateTemplate()`: `PUT /api/templates/${id}`
- `deleteTemplate()`: `DELETE /api/templates/${id}` (with confirmation)
- `toggleFavorite()`: `PUT /api/templates/${id}` with `{ isFavorite: !template.isFavorite }`

**Effects**:
- Load templates on mount
- Reload on category/search/sort change (debounced 300ms for search)

## 8. Playground Integration

### 8.1 Modified: `src/features/playground/hooks/usePlayground.ts`

Add template-related state and actions:

```typescript
// New state additions inside usePlayground():

// Template sidebar
const [sidebarOpen, setSidebarOpen] = useState(false)

// Load template into playground
const loadTemplate = useCallback((template: PromptTemplate, variableValues: VariableValues) => {
  // Substitute variables in prompts
  const finalSystem = template.systemPrompt
    ? substituteVariables(template.systemPrompt, variableValues)
    : ''
  const finalUser = substituteVariables(template.userPrompt, variableValues)

  setSystemPrompt(finalSystem)
  setUserPrompt(finalUser)

  // Apply default parameters if set
  if (template.defaultTemperature !== undefined && template.defaultTemperature !== null) {
    setTemperature(template.defaultTemperature)
  }
  if (template.defaultMaxTokens !== undefined && template.defaultMaxTokens !== null) {
    setMaxTokens(template.defaultMaxTokens)
  }

  // Try to select matching provider/model
  if (template.defaultProvider) {
    const matchingProvider = activeProviders.find((p) => p.type === template.defaultProvider)
    if (matchingProvider) {
      handleProviderChange(matchingProvider.id)
      if (template.defaultModel) {
        setModel(template.defaultModel)
      }
    }
  }

  // Close sidebar after loading
  setSidebarOpen(false)
  setMode('single')
  setResult(null)
  setError(null)
}, [activeProviders, handleProviderChange])

// Save current prompt as template (returns data for TemplateEditor)
const getTemplateData = useCallback((): Partial<CreateTemplateRequest> => {
  const selectedProvider = activeProviders.find((p) => p.id === providerId)
  return {
    systemPrompt: systemPrompt || undefined,
    userPrompt,
    defaultModel: model || undefined,
    defaultProvider: selectedProvider?.type || undefined,
    defaultTemperature: temperature,
    defaultMaxTokens: maxTokens,
  }
}, [systemPrompt, userPrompt, model, providerId, temperature, maxTokens, activeProviders])

// Add to return object:
// sidebarOpen, setSidebarOpen, loadTemplate, getTemplateData
```

### 8.2 Modified: `src/app/(dashboard)/playground/page.tsx`

Add sidebar toggle button and `TemplateSidebar` integration:

```tsx
// New imports:
import { TemplateSidebar } from '@/features/templates/components/TemplateSidebar'
import { BookTemplate } from 'lucide-react'

// In header area, add sidebar toggle button:
<button
  onClick={() => pg.setSidebarOpen(!pg.sidebarOpen)}
  className={cn(
    'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
    pg.sidebarOpen
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
  )}
>
  <BookTemplate className="h-4 w-4" />
  템플릿
</button>

// Add "템플릿으로 저장" button near PlaygroundEditor:
// Shows when userPrompt is non-empty
<button
  onClick={() => {/* open TemplateEditor with getTemplateData() prefilled */}}
  className="text-xs text-slate-500 hover:text-indigo-600 transition-colors"
>
  템플릿으로 저장
</button>

// Sidebar component (outside main content flow):
<TemplateSidebar
  isOpen={pg.sidebarOpen}
  onToggle={() => pg.setSidebarOpen(!pg.sidebarOpen)}
  onSelectTemplate={pg.loadTemplate}
/>
```

## 9. Templates Page

### File: `src/app/(dashboard)/templates/page.tsx`

**Layout**:
- Header: "프롬프트 템플릿" + description + "새 템플릿" button (Plus icon)
- Filter bar: Category select + Search input + Sort select
- Template count: "총 {total}개"
- Limit warning (when `limitReached`): "Free 플랜은 최대 10개의 템플릿을 사용할 수 있습니다. Growth 플랜으로 업그레이드 →"
- `TemplateList` grid
- `TemplateEditor` modal (opens on create/edit)
- Delete confirmation dialog

**Structure**:
```tsx
'use client'

export default function TemplatesPage() {
  const { isReady } = useSession()
  if (!isReady) return <SkeletonLoader />
  return <TemplatesContent />
}

function TemplatesContent() {
  const tmpl = useTemplates()
  // ... render header, filters, list, editor modal
}
```

## 10. Navigation

### Modified: `src/lib/constants.ts`

Add templates to `NAV_ITEMS`:

```typescript
export const NAV_ITEMS = [
  { label: '대시보드', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: '프로바이더', href: '/providers', icon: 'Plug' },
  { label: '프로젝트', href: '/projects', icon: 'FolderOpen' },
  { label: '예산', href: '/budget', icon: 'Wallet' },
  { label: '알림', href: '/alerts', icon: 'Bell' },
  { label: '리포트', href: '/reports', icon: 'FileText' },
  { label: '프록시', href: '/proxy', icon: 'ArrowLeftRight' },
  { label: '팀', href: '/team', icon: 'Users' },
  { label: '플레이그라운드', href: '/playground', icon: 'Terminal' },
  { label: '템플릿', href: '/templates', icon: 'BookTemplate' },
] as const
```

### Modified: `src/components/layout/NavBar.tsx`

```typescript
import {
  LayoutDashboard, Plug, FolderOpen, Wallet, Bell, FileText,
  Settings, Menu, X, Zap, LogOut, Terminal, BookTemplate,
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Plug, FolderOpen, Wallet, Bell, FileText, Terminal, BookTemplate,
}
```

## 11. Data Model

### Table: `prompt_templates`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, auto-generated | |
| orgId | string | FK → organizations, required | |
| userId | string | FK → users, required | Template creator |
| name | string | required, max 100 chars | |
| description | string | nullable, max 500 chars | |
| category | string | default: 'other' | translation/summary/code/analysis/marketing/other/custom |
| systemPrompt | text | nullable | |
| userPrompt | text | required | |
| variables | json | default: '[]' | `TemplateVariable[]` |
| defaultModel | string | nullable | e.g., 'gpt-4o' |
| defaultProvider | string | nullable | e.g., 'openai' |
| defaultTemperature | float | nullable | 0-2 |
| defaultMaxTokens | integer | nullable | 1-4096 |
| visibility | string | default: 'private' | 'private' or 'shared' |
| isFavorite | boolean | default: false | Per-user (owner only) |
| usageCount | integer | default: 0 | Incremented on each use |
| createdAt | datetime | auto-generated | |
| updatedAt | datetime | auto-updated | |

**Indexes**:
- `orgId` — for organization-scoped queries
- `userId` — for user-owned templates
- `category` — for category filtering
- `visibility` — for shared template queries

## 12. Error Handling

| Route | Status | Condition | Response |
|-------|--------|-----------|----------|
| GET /api/templates | 401 | Not authenticated | `{ error: '인증이 필요합니다.' }` |
| POST /api/templates | 400 | Missing name or userPrompt | `{ error: '템플릿 이름과 유저 프롬프트는 필수입니다.' }` |
| POST /api/templates | 403 | Template limit reached | `{ error: 'Free 플랜은 최대 10개의 템플릿을 사용할 수 있습니다.', planRequired: 'growth' }` |
| GET /api/templates/:id | 403 | No access | `{ error: '이 템플릿에 접근 권한이 없습니다.' }` |
| GET /api/templates/:id | 404 | Not found | `{ error: '템플릿을 찾을 수 없습니다.' }` |
| PUT /api/templates/:id | 403 | Not owner | `{ error: '템플릿 작성자만 수정할 수 있습니다.' }` |
| DELETE /api/templates/:id | 403 | Not owner | `{ error: '템플릿 작성자만 삭제할 수 있습니다.' }` |
| * | 500 | Server error | `{ error: '서버 오류가 발생했습니다.' }` |

## 13. Implementation Order

| Phase | Scope | Files | Dependencies |
|-------|-------|-------|--------------|
| Phase 1 | Types & Utils | `types/template.ts`, `utils/variables.ts` | None |
| Phase 2 | API Routes + Limits | `api/templates/route.ts`, `api/templates/[id]/route.ts`, `constants.ts`, `plan-limits.ts` | Phase 1 |
| Phase 3 | Core UI | `TemplateCard.tsx`, `TemplateList.tsx`, `TemplateEditor.tsx`, `VariableForm.tsx`, `useTemplates.ts` | Phase 2 |
| Phase 4 | Playground Integration | `TemplateSidebar.tsx`, `usePlayground.ts` modification | Phase 3 |
| Phase 5 | Page & Navigation | `templates/page.tsx`, `NavBar.tsx`, `playground/page.tsx` modification | Phase 4 |

## 14. UI Style Guide

All components follow the existing design system patterns:

| Element | Style |
|---------|-------|
| Card | `rounded-2xl border border-slate-200/60 bg-white shadow-sm` |
| Card hover | `hover:shadow-md transition-all` |
| Button primary | `bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl` |
| Button secondary | `border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl` |
| Badge | `<Badge>` component from `@/components/ui/Badge` |
| Input | `<Input>` component from `@/components/ui/Input` |
| Empty state | Dashed border container with descriptive text and CTA |
| Warning banner | `rounded-2xl border border-amber-200 bg-amber-50 p-4` with AlertTriangle icon |
| Modal overlay | `fixed inset-0 bg-black/50 z-50` with centered `bg-white rounded-2xl` content |
| Sidebar panel | `fixed right-0 top-16 bottom-0 w-80 bg-white border-l shadow-xl z-30` |
| Text gradient | `text-gradient` class for accent text |

## 15. Security Considerations

| Concern | Mitigation |
|---------|------------|
| XSS via template content | All prompts rendered as plain text (`<pre>` or `textContent`), never `dangerouslySetInnerHTML` |
| Unauthorized template access | Server-side ownership check on PUT/DELETE; shared templates read-only for non-owners |
| Variable injection | Variables are plain text substitution only; no code execution |
| Excessive templates | Plan-based limits enforced server-side via `checkTemplateLimit()` |
| Data leakage across orgs | All queries scoped by `orgId` |
