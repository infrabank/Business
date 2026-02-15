# bkend.ai Integration Design Document

> **Summary**: Mock 데이터를 bkend.ai 실제 백엔드로 교체하는 상세 설계
>
> **Project**: LLM Cost Manager
> **Version**: 0.1.0
> **Author**: Solo Founder
> **Date**: 2026-02-15
> **Status**: Draft
> **Planning Doc**: [bkend-integration.plan.md](../../01-plan/features/bkend-integration.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- Mock 데이터 의존성을 완전히 제거하고 bkend.ai REST API로 교체
- 인증 미들웨어를 통한 보호된 라우트 구현
- 로그인 후 사용자의 Organization을 자동 로드하여 Zustand store에 설정
- 기존 API 라우트(이미 bkend.get 사용)는 최소 변경으로 동작 확인

### 1.2 Current State Analysis

**잘 되어 있는 것 (변경 불필요 또는 최소):**
- `lib/bkend.ts` - HTTP 클라이언트 완전 구현됨
- `lib/auth.ts` - signup/login/refresh/getMe/cookie 관리 완전 구현됨
- `useAuth` hook - login/signup/logout 이미 lib/auth.ts 호출
- 6개 API 라우트 - 이미 `bkend.get()` + Bearer token 사용
- `services/*` - 이미 bkend 클라이언트 사용

**교체 필요 (mock → real):**
- `app/(dashboard)/dashboard/page.tsx` - 모듈 레벨 mock import
- `features/dashboard/hooks/useDashboard.ts` - mock fallback
- `features/providers/hooks/useProviders.ts` - mockProviders 배열
- `features/budget/hooks/useBudgets.ts` - mockBudgetStatuses 배열
- `features/alerts/hooks/useAlerts.ts` - mockAlerts 배열
- `features/optimization/hooks/useOptimization.ts` - mockTips 배열

**신규 생성:**
- `middleware.ts` - Next.js 미들웨어 (인증 보호)

---

## 2. Architecture

### 2.1 Auth + Data Flow

```
┌──────────────────────────────────────────────────────┐
│ 1. Login Flow                                        │
│                                                      │
│ LoginForm → useAuth.login()                          │
│   → POST /auth/login (bkend.ai)                     │
│   → { accessToken, refreshToken }                    │
│   → setAuthCookies()                                 │
│   → getMe(token) → { id, email, name }              │
│   → GET /organizations (filter: ownerId=user.id)     │
│   → setCurrentOrgId(org.id)   ← Zustand store       │
│   → router.push('/dashboard')                        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 2. Authenticated Page Request                        │
│                                                      │
│ Browser → middleware.ts                              │
│   → Check access_token cookie                        │
│   → Missing? → redirect /login                       │
│   → Present? → continue                              │
│                                                      │
│ Page Component (use client)                          │
│   → useAppStore().currentOrgId                       │
│   → null? → fetch org from bkend.ai + set store     │
│   → hooks(orgId) → fetch('/api/...', { auth })       │
│                                                      │
│ API Route                                            │
│   → Bearer token from cookie (via hook)              │
│   → bkend.get('/resource', { token })                │
│   → return JSON                                      │
└──────────────────────────────────────────────────────┘
```

### 2.2 Token Passing Strategy

**Client-Side (hooks → API routes):**
```typescript
// hooks에서 API 라우트 호출 시 cookie에서 token 추출
const token = getTokenFromCookie()
fetch('/api/dashboard/summary?orgId=xxx', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

**Server-Side (API routes → bkend.ai):**
```typescript
// API 라우트에서 이미 구현됨
const token = req.headers.get('authorization')?.replace('Bearer ', '')
bkend.get('/usage-records', { token, params: { orgId } })
```

---

## 3. File-by-File Design Spec

### 3.1 [NEW] `app/src/middleware.ts`

**Purpose**: 인증되지 않은 사용자의 dashboard 접근 차단

```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  // Dashboard routes require auth
  if (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/providers') ||
      pathname.startsWith('/budget') ||
      pathname.startsWith('/alerts') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/projects') ||
      pathname.startsWith('/settings')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Auth routes redirect to dashboard if already logged in
  if ((pathname === '/login' || pathname === '/signup') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/providers/:path*',
    '/budget/:path*',
    '/alerts/:path*',
    '/reports/:path*',
    '/projects/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
  ],
}
```

**Notes:**
- Token 유효성 검증은 하지 않음 (API 라우트에서 bkend.ai가 검증)
- Cookie 존재 여부만 확인 → 빠른 리다이렉트
- 만료된 token은 API 호출 시 401 → 클라이언트에서 처리

### 3.2 [MODIFY] `app/src/lib/store.ts`

**Changes**: currentUser 추가, 초기화 함수 추가

```typescript
import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string
}

interface AppState {
  currentUser: User | null
  currentOrgId: string | null
  sidebarOpen: boolean
  setCurrentUser: (user: User | null) => void
  setCurrentOrgId: (id: string | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  clearSession: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  currentOrgId: null,
  sidebarOpen: true,
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentOrgId: (id) => set({ currentOrgId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  clearSession: () => set({ currentUser: null, currentOrgId: null }),
}))
```

### 3.3 [NEW] `app/src/hooks/useSession.ts`

**Purpose**: 앱 초기화 시 로그인 상태 복원 (token → user → org)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { getTokenFromCookie, getMe, clearAuthCookies } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { Organization } from '@/types'

export function useSession() {
  const { currentUser, currentOrgId, setCurrentUser, setCurrentOrgId, clearSession } = useAppStore()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    async function restore() {
      const token = getTokenFromCookie()
      if (!token) {
        setIsReady(true)
        return
      }

      try {
        // 1. Get current user
        const user = await getMe(token)
        setCurrentUser(user)

        // 2. Get user's organizations
        const orgs = await bkend.get<Organization[]>('/organizations', {
          token,
          params: { ownerId: user.id }
        })

        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id)
        }
      } catch {
        // Token expired or invalid
        clearAuthCookies()
        clearSession()
      } finally {
        setIsReady(true)
      }
    }

    if (!currentUser) {
      restore()
    } else {
      setIsReady(true)
    }
  }, [currentUser])

  return { isReady, currentUser, currentOrgId }
}
```

### 3.4 [MODIFY] `app/src/features/auth/hooks/useAuth.ts`

**Changes**: login/signup 후 user + org 세팅 추가

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as auth from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { useAppStore } from '@/lib/store'
import type { Organization } from '@/types'

interface UseAuthResult {
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
}

export function useAuth(): UseAuthResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { setCurrentUser, setCurrentOrgId, clearSession } = useAppStore()

  const initSession = useCallback(async (token: string) => {
    const user = await auth.getMe(token)
    setCurrentUser(user)

    const orgs = await bkend.get<Organization[]>('/organizations', {
      token,
      params: { ownerId: user.id }
    })

    if (orgs.length > 0) {
      setCurrentOrgId(orgs[0].id)
    } else {
      // Auto-create first org
      const newOrg = await bkend.post<Organization>('/organizations', {
        name: `${user.name}'s Workspace`,
        slug: user.email.split('@')[0],
        ownerId: user.id,
      }, { token })
      setCurrentOrgId(newOrg.id)
    }
  }, [setCurrentUser, setCurrentOrgId])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const tokens = await auth.login(email, password)
      auth.setAuthCookies(tokens)
      await initSession(tokens.accessToken)
      router.push('/dashboard')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [initSession, router])

  const signup = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const tokens = await auth.signup(email, password, name)
      auth.setAuthCookies(tokens)
      await initSession(tokens.accessToken)
      router.push('/dashboard')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [initSession, router])

  const logout = useCallback(() => {
    auth.clearAuthCookies()
    clearSession()
    router.push('/login')
  }, [clearSession, router])

  return { isLoading, error, login, signup, logout }
}
```

### 3.5 [MODIFY] `app/src/features/dashboard/hooks/useDashboard.ts`

**Changes**: mock import 제거, token 포함 API 호출

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTokenFromCookie } from '@/lib/auth'
import type { DashboardSummary, ChartDataPoint } from '@/types/dashboard'

interface UseDashboardOptions {
  orgId?: string | null
  period?: '7d' | '30d' | '90d'
}

interface UseDashboardResult {
  summary: DashboardSummary | null
  chartData: ChartDataPoint[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboard({ orgId, period = '7d' }: UseDashboardOptions = {}): UseDashboardResult {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const token = getTokenFromCookie()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    try {
      const [summaryRes, chartRes] = await Promise.all([
        fetch(`/api/dashboard/summary?orgId=${orgId}`, { headers }),
        fetch(`/api/dashboard/chart?orgId=${orgId}&period=${period}`, { headers }),
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
  }, [orgId, period])

  useEffect(() => { fetchData() }, [fetchData])

  return { summary, chartData, isLoading, error, refetch: fetchData }
}
```

### 3.6 [MODIFY] `features/providers/hooks/useProviders.ts`

**Changes**: mockProviders 삭제, bkend CRUD 구현

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTokenFromCookie } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { Provider, ProviderType } from '@/types'

export function useProviders(orgId?: string | null) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchProviders = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const token = getTokenFromCookie()
      const data = await bkend.get<Provider[]>('/providers', {
        token: token || undefined,
        params: { orgId }
      })
      setProviders(data)
    } catch { /* error handling */ }
    finally { setIsLoading(false) }
  }, [orgId])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  const addProvider = useCallback(async (data: { type: ProviderType; name: string; apiKey: string }) => {
    const token = getTokenFromCookie()
    if (!token || !orgId) return false
    try {
      // 1. Validate key
      const validateRes = await fetch('/api/providers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ providerType: data.type, apiKey: data.apiKey }),
      })
      if (!validateRes.ok) return false

      // 2. Create provider
      const provider = await bkend.post<Provider>('/providers', {
        orgId, type: data.type, name: data.name, isActive: true
      }, { token })

      // 3. Create encrypted API key
      const encRes = await fetch('/api/providers/encrypt-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ providerId: provider.id, apiKey: data.apiKey, label: data.name }),
      })

      await fetchProviders()
      return encRes.ok
    } catch { return false }
  }, [orgId, fetchProviders])

  const deleteProvider = useCallback(async (providerId: string) => {
    const token = getTokenFromCookie()
    if (!token) return false
    try {
      await bkend.delete('/providers/' + providerId, { token })
      await fetchProviders()
      return true
    } catch { return false }
  }, [fetchProviders])

  return { providers, isLoading, refetch: fetchProviders, addProvider, deleteProvider }
}
```

### 3.7 [MODIFY] `features/budget/hooks/useBudgets.ts`

**Changes**: mockBudgetStatuses 삭제, bkend CRUD

```typescript
// Same pattern as useProviders:
// - Remove mockBudgetStatuses array
// - if (!orgId) → return early, no mock
// - fetchBudgets → bkend.get('/budgets', { token, params: { orgId } })
// - Add createBudget, updateBudget functions
```

### 3.8 [MODIFY] `features/alerts/hooks/useAlerts.ts`

**Changes**: mockAlerts 삭제, bkend CRUD

```typescript
// Same pattern:
// - Remove mockAlerts array
// - fetchAlerts → bkend.get('/alerts', { token, params: { orgId } })
// - markAsRead → bkend.patch('/alerts/' + alertId, { isRead: true }, { token })
```

### 3.9 [MODIFY] `features/optimization/hooks/useOptimization.ts`

**Changes**: mockTips 삭제, bkend CRUD

```typescript
// Same pattern:
// - Remove mockTips array
// - fetchTips → bkend.get('/optimization-tips', { token, params: { orgId } })
// - applyTip → bkend.patch('/optimization-tips/' + tipId, { status: 'applied' }, { token })
// - dismissTip → bkend.patch('/optimization-tips/' + tipId, { status: 'dismissed' }, { token })
```

### 3.10 [MODIFY] `app/(dashboard)/dashboard/page.tsx`

**Changes**: mock import 제거 → `useDashboard` hook 사용

```typescript
'use client'

import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
// ... other component imports (unchanged)

export default function DashboardPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { summary, chartData, isLoading } = useDashboard({ orgId, period: '30d' })

  if (!isReady || isLoading || !summary) {
    return <div className="animate-pulse">Loading...</div>
  }

  // ... rest of JSX (identical to current, but uses hook data)
}
```

### 3.11 [MODIFY] Other Dashboard Pages

동일 패턴으로 수정:

| Page | Mock Import | Replace With |
|------|-------------|-------------|
| `providers/page.tsx` | mockProviders inline | `useProviders(orgId)` |
| `providers/[id]/page.tsx` | mock provider detail | `useProviders(orgId)` + filter |
| `budget/page.tsx` | mock budget data | `useBudgets(orgId)` |
| `alerts/page.tsx` | mock alerts | `useAlerts(orgId)` |
| `projects/page.tsx` | mock projects | New `useProjects(orgId)` hook |

### 3.12 [NEW] `app/src/app/api/providers/encrypt-key/route.ts`

**Purpose**: API 키 암호화 후 bkend.ai에 저장

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { encrypt } from '@/services/encryption.service'
import { bkend } from '@/lib/bkend'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { providerId, apiKey, label } = await req.json()

  const encryptedKey = encrypt(apiKey)
  const keyPrefix = apiKey.substring(0, 8) + '...'

  const result = await bkend.post('/api-keys', {
    providerId, encryptedKey, keyPrefix, label, isActive: true
  }, { token })

  return NextResponse.json(result)
}
```

### 3.13 [DELETE] `app/src/lib/mock-data.ts`

**Action**: 파일 삭제. 모든 import 제거 후 삭제.

---

## 4. bkend.ai Table Setup Guide

### 4.1 Required Tables (10)

bkend.ai MCP 또는 REST API로 생성:

```
Table: organizations
  - id: uuid (pk, auto)
  - name: text (required)
  - ownerId: text (required, FK users)
  - slug: text (required, unique)
  - billingEmail: text
  - createdAt: datetime (auto)
  - updatedAt: datetime (auto)

Table: members
  - id: uuid (pk, auto)
  - userId: text (required)
  - orgId: text (required, FK organizations)
  - role: text (required, enum: owner/admin/viewer)
  - joinedAt: datetime (auto)

Table: projects
  - id: uuid (pk, auto)
  - orgId: text (required, FK organizations)
  - name: text (required)
  - description: text
  - color: text
  - createdAt: datetime (auto)

Table: providers
  - id: uuid (pk, auto)
  - orgId: text (required, FK organizations)
  - type: text (required, enum: openai/anthropic/google)
  - name: text (required)
  - isActive: boolean (required, default true)
  - lastSyncAt: datetime
  - createdAt: datetime (auto)

Table: api_keys
  - id: uuid (pk, auto)
  - providerId: text (required, FK providers)
  - projectId: text (FK projects)
  - label: text (required)
  - encryptedKey: text (required)
  - keyPrefix: text (required)
  - isActive: boolean (required, default true)
  - createdAt: datetime (auto)

Table: usage_records
  - id: uuid (pk, auto)
  - apiKeyId: text (required, FK api_keys)
  - orgId: text (required, FK organizations)
  - providerType: text (required)
  - model: text (required)
  - inputTokens: number (required)
  - outputTokens: number (required)
  - totalTokens: number (required)
  - cost: number (required)
  - requestCount: number (required)
  - date: text (required, YYYY-MM-DD)
  - createdAt: datetime (auto)

Table: budgets
  - id: uuid (pk, auto)
  - orgId: text (required, FK organizations)
  - projectId: text (FK projects)
  - amount: number (required)
  - alertThresholds: json (required, default [50,80,100])
  - period: text (required, default monthly)
  - isActive: boolean (required, default true)
  - createdAt: datetime (auto)

Table: alerts
  - id: uuid (pk, auto)
  - orgId: text (required, FK organizations)
  - type: text (required)
  - title: text (required)
  - message: text (required)
  - metadata: json
  - isRead: boolean (required, default false)
  - sentAt: datetime (auto)

Table: optimization_tips
  - id: uuid (pk, auto)
  - orgId: text (required, FK organizations)
  - category: text (required)
  - suggestion: text (required)
  - potentialSaving: number (required)
  - status: text (required, default pending)
  - createdAt: datetime (auto)
```

### 4.2 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BKEND_PROJECT_URL=https://api.bkend.ai/v1/projects/{YOUR_PROJECT_ID}
BKEND_API_KEY=bk_xxxxxxxxxxxx
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

---

## 5. Implementation Order (Checklist)

### Phase 1: Infrastructure
- [ ] bkend.ai 프로젝트 생성
- [ ] 10개 테이블 생성 (Section 4.1 순서대로)
- [ ] `.env.local` 환경변수 설정
- [ ] `next build` 검증

### Phase 2: Auth + Session
- [ ] `middleware.ts` 생성 (Section 3.1)
- [ ] `lib/store.ts` 수정 - currentUser, clearSession 추가 (Section 3.2)
- [ ] `hooks/useSession.ts` 생성 (Section 3.3)
- [ ] `features/auth/hooks/useAuth.ts` 수정 - initSession 추가 (Section 3.4)
- [ ] 로그인 → 대시보드 리다이렉트 검증

### Phase 3: Provider + ApiKey CRUD
- [ ] `features/providers/hooks/useProviders.ts` - mock 제거, bkend CRUD (Section 3.6)
- [ ] `api/providers/encrypt-key/route.ts` 생성 (Section 3.12)
- [ ] `providers/page.tsx` - hook 사용으로 전환
- [ ] `providers/[id]/page.tsx` - hook 사용으로 전환

### Phase 4: Dashboard Data
- [ ] `features/dashboard/hooks/useDashboard.ts` - mock 제거 (Section 3.5)
- [ ] `app/(dashboard)/dashboard/page.tsx` - hook 사용 전환 (Section 3.10)

### Phase 5: Remaining CRUD
- [ ] `features/budget/hooks/useBudgets.ts` - mock 제거, bkend CRUD (Section 3.7)
- [ ] `features/alerts/hooks/useAlerts.ts` - mock 제거, bkend CRUD (Section 3.8)
- [ ] `features/optimization/hooks/useOptimization.ts` - mock 제거, bkend CRUD (Section 3.9)
- [ ] `budget/page.tsx` - hook 사용 전환
- [ ] `alerts/page.tsx` - hook 사용 전환
- [ ] `projects/page.tsx` - hook 사용 전환 (new useProjects hook)

### Phase 6: Cleanup
- [ ] `lib/mock-data.ts` 삭제 (Section 3.13)
- [ ] 모든 mock import 제거 검증 (grep "mock")
- [ ] `next build` 성공 검증
- [ ] TypeScript 0 errors 검증

---

## 6. New Files Summary

| File | Type | Purpose |
|------|------|---------|
| `app/src/middleware.ts` | New | Auth route protection |
| `app/src/hooks/useSession.ts` | New | Session restore (token → user → org) |
| `app/src/app/api/providers/encrypt-key/route.ts` | New | API key encryption endpoint |

## 7. Modified Files Summary

| File | Change | Scope |
|------|--------|-------|
| `lib/store.ts` | Add currentUser, clearSession | Small |
| `features/auth/hooks/useAuth.ts` | Add initSession, router.push | Medium |
| `features/dashboard/hooks/useDashboard.ts` | Remove mock import/fallback | Medium |
| `features/providers/hooks/useProviders.ts` | Remove mock, add full CRUD | Large |
| `features/budget/hooks/useBudgets.ts` | Remove mock, add CRUD | Medium |
| `features/alerts/hooks/useAlerts.ts` | Remove mock, real markAsRead | Medium |
| `features/optimization/hooks/useOptimization.ts` | Remove mock, real apply/dismiss | Medium |
| `app/(dashboard)/dashboard/page.tsx` | Use hook instead of mock import | Medium |
| `app/(dashboard)/providers/page.tsx` | Use hook | Small |
| `app/(dashboard)/providers/[id]/page.tsx` | Use hook | Small |
| `app/(dashboard)/budget/page.tsx` | Use hook | Small |
| `app/(dashboard)/alerts/page.tsx` | Use hook | Small |
| `app/(dashboard)/projects/page.tsx` | Use hook | Small |

## 8. Deleted Files

| File | Reason |
|------|--------|
| `lib/mock-data.ts` | All mock data replaced with real API calls |

---

## 9. Error Handling Strategy

### 9.1 Auth Errors

| Scenario | Response | Client Action |
|----------|----------|---------------|
| No token (middleware) | Redirect /login | - |
| 401 from API route | JSON { error } | Show error, redirect /login |
| Token expired (API) | 401 | useSession tries refresh → fail → /login |
| Invalid credentials | 400 from bkend.ai | Show form error |

### 9.2 Data Errors

| Scenario | Response | Client Action |
|----------|----------|---------------|
| No org found | Empty response | Show "Create Organization" prompt |
| No data yet | Empty arrays | Show empty state UI (already exists) |
| bkend.ai down | 500/502 | Show error message, retry button |
| Network error | fetch throws | Show "Check connection" message |

---

## 10. Testing Verification Points

After implementation, verify these flows manually:

1. **Signup**: email + password → auto-create org → dashboard 도착
2. **Login**: 기존 계정 → token 저장 → dashboard 데이터 표시
3. **Middleware**: 로그아웃 후 /dashboard → /login 리다이렉트
4. **Provider CRUD**: 등록 → 목록 조회 → 삭제
5. **Dashboard**: orgId로 summary/chart API 호출 → 실제 데이터 반환
6. **Build**: `next build` TypeScript 0 errors

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-15 | Initial design - file-by-file integration spec | Solo Founder |
