# Dashboard Analytics (dashboard-analytics) Design Document

> **Feature**: Dashboard Analytics - 실시간 분석 & 인사이트 대시보드
>
> **Project**: LLM Cost Manager
> **Author**: Solo Founder
> **Date**: 2026-02-15
> **Status**: Draft
> **Level**: Dynamic
> **Plan Reference**: `docs/01-plan/features/dashboard-analytics.plan.md`

---

## 1. Architecture Overview

### 1.1 Current State

```
Dashboard Page
├── StatCard x4 (Total Cost, Tokens, Requests, Budget)
├── CostTrendChart (Area chart, single period)
├── ProviderPieChart (By provider)
├── ModelBarChart (Top models)
├── Recent Alerts (live data)
└── Optimization Tips (placeholder)
```

### 1.2 Target State

```
Dashboard Page
├── PeriodSelector (7d / 30d / 90d tabs)        ← NEW
├── ProviderFilter (toggle buttons)              ← NEW
├── StatCard x5 (+Projected Cost)                ← MODIFIED
├── CostTrendChart (Area + comparison line)       ← MODIFIED
├── ProviderPieChart (filtered)                   ← MODIFIED (data only)
├── ModelBarChart (filtered)                      ← MODIFIED (data only)
├── ProjectBreakdownChart (horizontal bar)        ← NEW
├── Recent Alerts (unchanged)
└── OptimizationTipsPanel (live data)             ← MODIFIED
```

### 1.3 Data Flow

```
User Action (period/filter change)
    ↓
useDashboard({ orgId, period, providerTypes })
    ↓ parallel fetch
┌─────────────────────────────┬──────────────────────────────────┐
│ GET /api/dashboard/summary  │ GET /api/dashboard/chart         │
│   ?orgId=X                  │   ?orgId=X                       │
│   &providerTypes=openai,... │   &period=30d                    │
│                             │   &providerTypes=openai,...       │
│                             │   &comparison=true               │
├─────────────────────────────┼──────────────────────────────────┤
│ DashboardSummary            │ ChartDataPoint[]                 │
│   + forecast                │   + previousCost                 │
│   + byProject (populated)   │                                  │
│   + optimizationSummary     │                                  │
└─────────────────────────────┴──────────────────────────────────┘
    ↓
Dashboard renders with filtered + enriched data
```

---

## 2. Type Definitions

### 2.1 ChartDataPoint (Modified)

**File**: `src/types/dashboard.ts`

```typescript
export interface ChartDataPoint {
  date: string
  cost: number
  tokens: number
  requests: number
  previousCost?: number  // NEW: previous period cost for comparison overlay
}
```

### 2.2 DashboardSummary (Modified)

**File**: `src/types/dashboard.ts`

```typescript
export interface DashboardSummary {
  totalCost: {
    current: number
    previous: number
    changePercent: number
  }
  forecast: {                    // NEW
    projectedMonthly: number     // (dailyAverage * daysInMonth)
    daysRemaining: number
    dailyAverage: number
    budgetWarning: boolean       // true if projected > budget amount
  }
  byProvider: {
    type: ProviderType
    cost: number
    tokenCount: number
    requestCount: number
  }[]
  byProject: {                  // POPULATE (currently returns [])
    projectId: string
    name: string
    cost: number
    color: string
  }[]
  topModels: {
    model: string
    cost: number
    tokenCount: number
    avgCostPerRequest: number
  }[]
  budgetStatus: BudgetStatus[]
  recentAlerts: Alert[]
  optimizationSummary: {        // NEW
    totalSavings: number
    tipsCount: number
    topTip?: string
  }
}
```

### 2.3 Dashboard Period Type

```typescript
export type DashboardPeriod = '7d' | '30d' | '90d'
```

---

## 3. Component Specifications

### 3.1 PeriodSelector

**File**: `src/features/dashboard/components/PeriodSelector.tsx`
**Type**: New Component

```typescript
interface PeriodSelectorProps {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
}
```

**Behavior**:
- Renders 3 tab buttons: "7D", "30D", "90D"
- Active tab has `bg-blue-600 text-white`, inactive `bg-gray-100 text-gray-600 hover:bg-gray-200`
- Rounded pill style (`rounded-lg` group wrapper with `rounded-md` buttons)
- On click, calls `onChange` with new period
- Keyboard accessible: tab focus + Enter/Space to select

**Layout**:
```
┌──────────────────────────────────────────┐
│ Dashboard                     [7D][30D][90D] │
│ Your LLM spending at a glance              │
└──────────────────────────────────────────┘
```

**Styling**:
```tsx
// Container
<div className="inline-flex rounded-lg bg-gray-100 p-1">
  // Each button
  <button className={cn(
    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
    isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
  )}>
```

### 3.2 ProviderFilter

**File**: `src/features/dashboard/components/ProviderFilter.tsx`
**Type**: New Component

```typescript
interface ProviderFilterProps {
  providers: ProviderType[]           // available providers from summary
  selected: ProviderType[]            // currently selected (active) providers
  onChange: (selected: ProviderType[]) => void
}
```

**Behavior**:
- Renders toggle button per provider with provider color indicator dot
- "All" button toggles all on/off
- Clicking a provider toggles its inclusion; minimum 1 must remain selected
- Provider labels from `PROVIDER_LABELS`, colors from `PROVIDER_COLORS`
- Unselected buttons have `opacity-50` and no color dot

**Layout**:
```
┌──────────────────────────────────────────────┐
│ [All] [● OpenAI] [● Anthropic] [● Google]   │
└──────────────────────────────────────────────┘
```

**Styling**:
```tsx
// Each provider button
<button className={cn(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
  isActive
    ? "border-gray-300 bg-white text-gray-900"
    : "border-gray-200 bg-gray-50 text-gray-400"
)}>
  {isActive && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
  {label}
</button>
```

### 3.3 CostTrendChart (Modified)

**File**: `src/features/dashboard/components/CostTrendChart.tsx`
**Changes**: Add comparison line overlay

```typescript
interface CostTrendChartProps {
  data: ChartDataPoint[]
  title?: string
  showComparison?: boolean  // NEW: show previous period line
}
```

**Changes**:
1. Add second `<Line>` component for `previousCost` data key
2. Previous period rendered as dashed gray line (`strokeDasharray="5 5"`, `stroke="#9CA3AF"`)
3. Custom Tooltip shows both current and previous values when comparison is active
4. Legend shows "Current Period" (blue solid) and "Previous Period" (gray dashed)

**Chart Structure**:
```tsx
<ComposedChart data={data}>
  <defs>
    <linearGradient id="colorCost" ...>
  </defs>
  <CartesianGrid />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip content={<CustomTooltip showComparison={showComparison} />} />
  {showComparison && <Legend />}
  <Area dataKey="cost" name="Current Period" stroke="#3B82F6" fill="url(#colorCost)" />
  {showComparison && (
    <Line dataKey="previousCost" name="Previous Period" stroke="#9CA3AF" strokeDasharray="5 5" dot={false} />
  )}
</ComposedChart>
```

**CustomTooltip**:
```tsx
function CustomTooltip({ active, payload, label, showComparison }) {
  // Shows:
  // Date: 02-15
  // Current: $12.50
  // Previous: $10.20 (+22.5%)   ← only when showComparison
}
```

### 3.4 StatCard (Modified)

**File**: `src/features/dashboard/components/StatCard.tsx`
**Changes**: Add `variant` prop for forecast warning

```typescript
interface StatCardProps {
  title: string
  value: string
  change?: number
  subtitle?: string
  variant?: 'default' | 'warning' | 'danger'  // NEW
  icon?: React.ReactNode                        // NEW
}
```

**Changes**:
- `variant="warning"`: amber left border (`border-l-4 border-l-amber-400`)
- `variant="danger"`: red left border (`border-l-4 border-l-red-500`)
- `icon` prop renders before the title
- Used for Projected Cost card: warning when projected > 80% budget, danger when > 100%

### 3.5 ProjectBreakdownChart

**File**: `src/features/dashboard/components/ProjectBreakdownChart.tsx`
**Type**: New Component

```typescript
interface ProjectBreakdownChartProps {
  data: DashboardSummary['byProject']
}
```

**Behavior**:
- If `data.length === 0`: show CTA card "Assign costs to projects for detailed breakdown" with link to `/projects`
- If data exists: horizontal `<BarChart>` with project names on Y-axis, cost on X-axis
- Max 10 projects displayed, sorted by cost descending
- Each bar gets a color from a predefined palette

**Chart Structure**:
```tsx
// Empty state
<Card>
  <CardContent className="py-8 text-center">
    <FolderOpen className="mx-auto h-8 w-8 text-gray-300" />
    <p className="mt-2 text-sm text-gray-500">Assign costs to projects for detailed breakdown</p>
    <Link href="/projects"><Button size="sm" variant="outline">Manage Projects</Button></Link>
  </CardContent>
</Card>

// With data
<Card>
  <CardHeader>
    <h3>Cost by Project</h3>
  </CardHeader>
  <CardContent>
    <BarChart layout="vertical" data={chartData}>
      <XAxis type="number" tickFormatter={(v) => `$${v}`} />
      <YAxis type="category" dataKey="name" width={120} />
      <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
      <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
        {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
      </Bar>
    </BarChart>
  </CardContent>
</Card>
```

### 3.6 OptimizationTipsPanel (Inline in Dashboard Page)

**Not a separate component file** - embedded directly in dashboard page replacing the placeholder.

**Behavior**:
- Uses `useOptimization(orgId)` hook to fetch tips
- Shows up to 3 active (pending) tips
- Each tip displays: category icon, suggestion text, potential saving amount
- Apply / Dismiss buttons per tip
- Summary line: "N tips available, potential savings: $X.XX"

**Category Icons** (from lucide-react):
| Category | Icon |
|----------|------|
| `model_downgrade` | `ArrowDownCircle` |
| `batch_processing` | `Layers` |
| `caching` | `Database` |
| `unused_key` | `KeyRound` |

**Tip Card Structure**:
```tsx
<div className="rounded-lg border border-gray-100 p-3">
  <div className="flex items-start gap-3">
    <CategoryIcon className="mt-0.5 h-5 w-5 text-blue-500" />
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-900">{tip.suggestion}</p>
      <p className="mt-0.5 text-sm text-green-600">
        Save ~{formatCurrency(tip.potentialSaving)}/month
      </p>
    </div>
    <div className="flex gap-1">
      <Button size="sm" variant="outline" onClick={() => applyTip(tip.id)}>Apply</Button>
      <Button size="sm" variant="ghost" onClick={() => dismissTip(tip.id)}>✕</Button>
    </div>
  </div>
</div>
```

---

## 4. API Specifications

### 4.1 GET /api/dashboard/summary (Modified)

**File**: `src/app/api/dashboard/summary/route.ts`

**New Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `providerTypes` | string (comma-separated) | all | Filter by providers |

**New Response Fields**:

```typescript
// Added to existing DashboardSummary response:
{
  // ... existing fields unchanged ...

  forecast: {
    projectedMonthly: number,  // dailyAvg * daysInMonth
    daysRemaining: number,
    dailyAverage: number,
    budgetWarning: boolean
  },

  byProject: [                // POPULATE - currently []
    {
      projectId: "proj_1",
      name: "Production API",
      cost: 45.20,
      color: "#3B82F6"
    }
  ],

  optimizationSummary: {
    totalSavings: 12.50,
    tipsCount: 3,
    topTip: "Switch gpt-4 to gpt-4-mini for classification tasks"
  }
}
```

**Forecast Calculation Logic**:
```typescript
const now = new Date()
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
const daysSoFar = now.getDate()
const dailyAverage = daysSoFar > 0 ? currentTotal / daysSoFar : 0
const projectedMonthly = dailyAverage * daysInMonth
const daysRemaining = daysInMonth - daysSoFar

// Budget warning: projected exceeds any active budget
const budgetWarning = budgets.length > 0 && budgets.some(b => projectedMonthly > b.amount)
```

**byProject Calculation Logic**:
```typescript
// Fetch projects for org
const projects = await bkend.get<Project[]>('/projects', { token, params: { orgId } })

// Map usage records to projects
const projectCostMap = new Map<string, number>()
for (const r of currentRecords) {
  if (r.projectId) {
    projectCostMap.set(r.projectId, (projectCostMap.get(r.projectId) || 0) + r.cost)
  }
}

// PROJECT_COLORS palette
const PROJECT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

const byProject = projects
  .map((p, i) => ({
    projectId: p.id,
    name: p.name,
    cost: projectCostMap.get(p.id) || 0,
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
  }))
  .filter(p => p.cost > 0)
  .sort((a, b) => b.cost - a.cost)
```

**optimizationSummary Calculation Logic**:
```typescript
const tips = await bkend.get<OptimizationTip[]>('/optimization-tips', {
  token, params: { orgId, status: 'pending' }
})

const optimizationSummary = {
  totalSavings: tips.reduce((sum, t) => sum + t.potentialSaving, 0),
  tipsCount: tips.length,
  topTip: tips.length > 0
    ? tips.sort((a, b) => b.potentialSaving - a.potentialSaving)[0].suggestion
    : undefined,
}
```

**Provider Filter Logic** (applied when `providerTypes` param present):
```typescript
const providerTypesParam = req.nextUrl.searchParams.get('providerTypes')
const providerFilter = providerTypesParam ? providerTypesParam.split(',') : null

// Apply to records before aggregation
const filteredRecords = providerFilter
  ? currentRecords.filter(r => providerFilter.includes(r.providerType))
  : currentRecords
```

### 4.2 GET /api/dashboard/chart (Modified)

**File**: `src/app/api/dashboard/chart/route.ts`

**New Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `providerTypes` | string (comma-separated) | all | Filter by providers |
| `comparison` | `"true"` / `"false"` | `"false"` | Include previous period data |

**Comparison Data Logic**:
```typescript
if (comparison === 'true') {
  // Fetch previous period records
  const prevFrom = new Date(from)
  prevFrom.setDate(prevFrom.getDate() - days)  // shift back by same period

  const prevRecords = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: {
      orgId,
      date_gte: prevFrom.toISOString().split('T')[0],
      date_lte: from.toISOString().split('T')[0],
    },
  })

  // Aggregate previous period by date
  const prevDateMap = new Map<string, number>()
  for (const r of prevRecords) {
    const date = r.date.split('T')[0]
    prevDateMap.set(date, (prevDateMap.get(date) || 0) + r.cost)
  }

  // Map previous costs to current period dates (offset by period days)
  const prevDates = Array.from(prevDateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  // Align: for each current date[i], previousCost = prevDates[i]?.cost
  data.forEach((point, i) => {
    point.previousCost = prevDates[i] ? Math.round(prevDates[i][1] * 100) / 100 : undefined
  })
}
```

**Provider Filter** (same pattern as summary):
```typescript
const providerFilter = providerTypesParam ? providerTypesParam.split(',') : null
const filteredRecords = providerFilter
  ? records.filter(r => providerFilter.includes(r.providerType))
  : records
```

---

## 5. Hook Modifications

### 5.1 useDashboard (Modified)

**File**: `src/features/dashboard/hooks/useDashboard.ts`

```typescript
interface UseDashboardOptions {
  orgId?: string | null
  period?: DashboardPeriod
  providerTypes?: ProviderType[]    // NEW: filter by providers
  comparison?: boolean               // NEW: include comparison data
}

interface UseDashboardResult {
  summary: DashboardSummary | null
  chartData: ChartDataPoint[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}
```

**Changes**:
1. Add `providerTypes` to query params (comma-separated)
2. Add `comparison=true` to chart API call when comparison is enabled
3. Both params included in `useCallback` dependency array

```typescript
export function useDashboard({
  orgId,
  period = '30d',
  providerTypes,
  comparison = true,
}: UseDashboardOptions = {}): UseDashboardResult {
  // ...

  const fetchData = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }

    setIsLoading(true)
    setError(null)

    const token = getTokenFromCookie()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const providerParam = providerTypes?.length
      ? `&providerTypes=${providerTypes.join(',')}`
      : ''
    const comparisonParam = comparison ? '&comparison=true' : ''

    try {
      const [summaryRes, chartRes] = await Promise.all([
        fetch(`/api/dashboard/summary?orgId=${orgId}${providerParam}`, { headers }),
        fetch(`/api/dashboard/chart?orgId=${orgId}&period=${period}${providerParam}${comparisonParam}`, { headers }),
      ])

      if (!summaryRes.ok || !chartRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      setSummary(await summaryRes.json())
      setChartData(await chartRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, period, providerTypes, comparison])

  useEffect(() => { fetchData() }, [fetchData])

  return { summary, chartData, isLoading, error, refetch: fetchData }
}
```

---

## 6. Dashboard Page Layout

### 6.1 Updated Page Structure

**File**: `src/app/(dashboard)/dashboard/page.tsx`

```tsx
export default function DashboardPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)

  // State
  const [period, setPeriod] = useState<DashboardPeriod>('30d')
  const [selectedProviders, setSelectedProviders] = useState<ProviderType[]>([])

  // Data
  const { summary, chartData, isLoading } = useDashboard({
    orgId,
    period,
    providerTypes: selectedProviders.length > 0 ? selectedProviders : undefined,
    comparison: true,
  })
  const { tips, applyTip, dismissTip } = useOptimization(orgId)

  // Initialize provider filter from summary
  useEffect(() => {
    if (summary && selectedProviders.length === 0) {
      setSelectedProviders(summary.byProvider.map(p => p.type))
    }
  }, [summary])

  // ... render
}
```

### 6.2 Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│ Dashboard                              [7D] [30D] [90D] │
│ Your LLM spending at a glance                           │
│                                                         │
│ [All] [● OpenAI] [● Anthropic] [● Google]               │
├────────┬────────┬────────┬────────┬────────────────────┤
│ Total  │ Total  │ API    │ Budget │ Projected          │
│ Cost   │ Tokens │ Reqs   │ Usage  │ Cost     ⚠️        │
│ $142   │ 2.1M   │ 1,240  │ 67%    │ $285 est.         │
├────────┴────────┴────────┴────────┴────────────────────┤
│                                                         │
│ Daily Cost (Last 30 Days)                               │
│ ━━━ current   ┄┄┄ previous                             │
│ [         Area + Line Chart                   ]         │
│                                                         │
├──────────────────────┬──────────────────────────────────┤
│ By Provider          │ Top Models                       │
│ [   Pie Chart   ]    │ [   Bar Chart   ]                │
├──────────────────────┴──────────────────────────────────┤
│                                                         │
│ Cost by Project                                         │
│ [   Horizontal Bar Chart   ]                            │
│                                                         │
├──────────────────────┬──────────────────────────────────┤
│ Recent Alerts (3)    │ Optimization Tips (3)            │
│ ┌─────────────────┐  │ ┌──── model_downgrade ────────┐ │
│ │ budget_warning   │  │ │ Switch gpt-4 → gpt-4-mini  │ │
│ │ Spending at 80%  │  │ │ Save ~$12.50/month          │ │
│ └─────────────────┘  │ │ [Apply] [✕]                 │ │
│                      │ └──────────────────────────────┘ │
└──────────────────────┴──────────────────────────────────┘
```

### 6.3 Responsive Breakpoints

| Breakpoint | StatCards | Charts | Bottom Row |
|------------|----------|--------|------------|
| Mobile (<640px) | 2 cols | 1 col stack | 1 col stack |
| Tablet (640-1024px) | 3 cols | 1 col stack | 1 col stack |
| Desktop (>1024px) | 5 cols | 2 col grid | 2 col grid |

**StatCard Grid**:
```tsx
<div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
```

---

## 7. Implementation Order

### Phase 1: Types & Period Selector (FR-01)

| # | Task | File | Type |
|---|------|------|------|
| 1.1 | Add `DashboardPeriod` type, `forecast`, `optimizationSummary`, `previousCost` to types | `src/types/dashboard.ts` | Modify |
| 1.2 | Create PeriodSelector component | `src/features/dashboard/components/PeriodSelector.tsx` | New |
| 1.3 | Add period state to dashboard page, integrate PeriodSelector | `src/app/(dashboard)/dashboard/page.tsx` | Modify |

### Phase 2: API Enhancement (FR-07, FR-08)

| # | Task | File | Type |
|---|------|------|------|
| 2.1 | Add `providerTypes` filter, `forecast`, `byProject`, `optimizationSummary` to summary API | `src/app/api/dashboard/summary/route.ts` | Modify |
| 2.2 | Add `providerTypes` filter, `comparison` data to chart API | `src/app/api/dashboard/chart/route.ts` | Modify |
| 2.3 | Update useDashboard hook with `providerTypes`, `comparison` params | `src/features/dashboard/hooks/useDashboard.ts` | Modify |

### Phase 3: Cost Comparison Chart (FR-02)

| # | Task | File | Type |
|---|------|------|------|
| 3.1 | Upgrade CostTrendChart: AreaChart → ComposedChart, add comparison Line, custom Tooltip | `src/features/dashboard/components/CostTrendChart.tsx` | Modify |

### Phase 4: Provider Filter & Forecast (FR-03, FR-06)

| # | Task | File | Type |
|---|------|------|------|
| 4.1 | Create ProviderFilter component | `src/features/dashboard/components/ProviderFilter.tsx` | New |
| 4.2 | Add `variant` + `icon` props to StatCard | `src/features/dashboard/components/StatCard.tsx` | Modify |
| 4.3 | Integrate ProviderFilter + Projected Cost StatCard into dashboard page | `src/app/(dashboard)/dashboard/page.tsx` | Modify |

### Phase 5: Project Breakdown & Optimization Tips (FR-04, FR-05)

| # | Task | File | Type |
|---|------|------|------|
| 5.1 | Create ProjectBreakdownChart component | `src/features/dashboard/components/ProjectBreakdownChart.tsx` | New |
| 5.2 | Replace Optimization Tips placeholder with live data (useOptimization) | `src/app/(dashboard)/dashboard/page.tsx` | Modify |
| 5.3 | Final dashboard page assembly with all components | `src/app/(dashboard)/dashboard/page.tsx` | Modify |

---

## 8. File Change Matrix

### New Files (3)

| # | File | Purpose | LOC Est. |
|---|------|---------|----------|
| 1 | `src/features/dashboard/components/PeriodSelector.tsx` | 기간 선택 탭 UI | ~30 |
| 2 | `src/features/dashboard/components/ProviderFilter.tsx` | 프로바이더 필터 토글 | ~55 |
| 3 | `src/features/dashboard/components/ProjectBreakdownChart.tsx` | 프로젝트별 비용 차트 | ~65 |

### Modified Files (7)

| # | File | Changes | LOC Change |
|---|------|---------|------------|
| 1 | `src/types/dashboard.ts` | `DashboardPeriod`, `forecast`, `optimizationSummary`, `previousCost` | +20 |
| 2 | `src/features/dashboard/hooks/useDashboard.ts` | `providerTypes`, `comparison` params | +15 |
| 3 | `src/features/dashboard/components/CostTrendChart.tsx` | ComposedChart + comparison Line + CustomTooltip | +40 |
| 4 | `src/features/dashboard/components/StatCard.tsx` | `variant`, `icon` props | +15 |
| 5 | `src/app/api/dashboard/summary/route.ts` | forecast, byProject, optimizationSummary, providerTypes filter | +55 |
| 6 | `src/app/api/dashboard/chart/route.ts` | comparison data, providerTypes filter | +35 |
| 7 | `src/app/(dashboard)/dashboard/page.tsx` | Full integration of all new components | +80 |

**Total**: 3 new files, 7 modified files, ~410 LOC added

---

## 9. Dependencies

### Existing (No Changes)
- `recharts` (ComposedChart, Line, Legend already available)
- `lucide-react` (ArrowDownCircle, Layers, Database, KeyRound, FolderOpen)
- `@/lib/constants` (PROVIDER_LABELS, PROVIDER_COLORS)

### No New Dependencies Required

---

## 10. Checklist for Gap Analysis

- [ ] `DashboardPeriod` type exported from `types/dashboard.ts`
- [ ] `ChartDataPoint.previousCost` optional field added
- [ ] `DashboardSummary.forecast` field added with all sub-fields
- [ ] `DashboardSummary.optimizationSummary` field added
- [ ] `PeriodSelector` component renders 7D/30D/90D tabs
- [ ] `PeriodSelector` active state styling correct
- [ ] `ProviderFilter` component renders toggle buttons per provider
- [ ] `ProviderFilter` has "All" toggle
- [ ] `ProviderFilter` minimum 1 provider enforced
- [ ] `CostTrendChart` uses ComposedChart with Area + Line
- [ ] `CostTrendChart` shows dashed gray line for previousCost
- [ ] `CostTrendChart` custom Tooltip shows current/previous comparison
- [ ] `StatCard` supports `variant` prop (default/warning/danger)
- [ ] `StatCard` supports `icon` prop
- [ ] `ProjectBreakdownChart` renders horizontal BarChart
- [ ] `ProjectBreakdownChart` shows CTA when no projects
- [ ] Dashboard page has period state with PeriodSelector
- [ ] Dashboard page has selectedProviders state with ProviderFilter
- [ ] Dashboard page shows 5th StatCard for Projected Cost
- [ ] Dashboard page shows forecast warning variant when budget exceeded
- [ ] Dashboard page renders ProjectBreakdownChart
- [ ] Dashboard page Optimization Tips uses useOptimization hook
- [ ] Dashboard page Optimization Tips shows category icon per tip
- [ ] Dashboard page Optimization Tips has Apply/Dismiss buttons
- [ ] `/api/dashboard/summary` accepts `providerTypes` filter param
- [ ] `/api/dashboard/summary` returns `forecast` data
- [ ] `/api/dashboard/summary` returns populated `byProject` data
- [ ] `/api/dashboard/summary` returns `optimizationSummary` data
- [ ] `/api/dashboard/chart` accepts `providerTypes` filter param
- [ ] `/api/dashboard/chart` accepts `comparison` param
- [ ] `/api/dashboard/chart` returns `previousCost` in ChartDataPoint when comparison=true
- [ ] `useDashboard` accepts `providerTypes` and `comparison` options
- [ ] `useDashboard` passes filter/comparison params to API calls
- [ ] StatCard grid responsive: 2 cols mobile, 3 cols tablet, 5 cols desktop
- [ ] Build succeeds with 0 errors

---

## 11. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| ComposedChart import issue | Low | Already in recharts package, no extra install |
| Provider filter causes empty data | Medium | Show "No data for selected filters" message |
| Forecast calculation edge case (day 1 of month) | Low | Guard: `daysSoFar > 0` before division |
| byProject empty (no projectId on records) | Medium | Show CTA to assign projects |
| Optimization tips API returns 0 results | Low | Show "No optimization tips yet" fallback |

---

## 12. Testing Considerations

| Test | Method |
|------|--------|
| Period Selector renders and switches | Visual verification |
| Provider Filter toggles correctly | Visual verification |
| Comparison chart shows two lines | Visual verification |
| Forecast calculation accuracy | Manual check with known data |
| Empty states display correctly | Test with no data |
| Responsive layout | Browser resize check |
| Build passes | `npm run build` |
