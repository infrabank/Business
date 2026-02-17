# Design: settings-preferences

> 설정 페이지 고도화 - 탭 네비게이션, 사용자 환경설정, 보안 설정, Danger Zone

## 1. Architecture Overview

```
현재 설정 페이지 (단일 스크롤)
  ├── 프로필 폼
  ├── 조직 폼
  ├── 팀 관리 링크
  ├── 알림 채널 (ChannelManager + NotificationSettings)
  ├── 구독 관리
  └── 수수료 위젯

→ 리팩토링 후 (탭 기반)

/settings?tab=general (기본)
  ├── SettingsTabs (탭 네비게이션)
  └── 탭별 콘텐츠
       ├── GeneralTab: 프로필 + 환경설정 + API 키 뷰
       ├── OrganizationTab: 조직 설정 + 팀 링크
       ├── NotificationsTab: ChannelManager + NotificationSettings
       ├── SubscriptionTab: 구독 + 청구서 + 수수료
       └── SecurityTab: 비밀번호 변경 + Danger Zone
```

### 핵심 설계 원칙
- **탭 전환 = 클라이언트 사이드**: URL query param(`?tab=`)으로 상태 유지, 페이지 리로드 없음
- **기존 코드 재사용**: 프로필/조직/알림/구독 로직은 기존 코드를 탭 컴포넌트로 분리만 함
- **환경설정 Zustand 통합**: `useAppStore`에 preferences 추가, 앱 전체에서 참조
- **Danger Zone 안전장치**: 확인 모달 + 텍스트 입력 필수 (DELETE 타이핑)

## 2. Type Definitions

### 2.1 `src/types/settings.ts` (NEW)

```typescript
// ---- User Preferences ----

export type CurrencyCode = 'USD' | 'KRW' | 'EUR' | 'JPY'
export type DateFormatType = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY'
export type NumberFormatType = '1,000.00' | '1.000,00'
export type DashboardPeriod = 7 | 30 | 90

export interface UserPreferences {
  id: string
  userId: string
  currency: CurrencyCode
  dateFormat: DateFormatType
  numberFormat: NumberFormatType
  dashboardPeriod: DashboardPeriod
  createdAt: string
  updatedAt: string
}

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  currency: 'USD',
  dateFormat: 'YYYY-MM-DD',
  numberFormat: '1,000.00',
  dashboardPeriod: 30,
}

// ---- Settings Tab ----

export type SettingsTab = 'general' | 'organization' | 'notifications' | 'subscription' | 'security'

export const SETTINGS_TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: '일반', icon: 'Settings' },
  { id: 'organization', label: '조직', icon: 'Building' },
  { id: 'notifications', label: '알림', icon: 'Bell' },
  { id: 'subscription', label: '구독', icon: 'CreditCard' },
  { id: 'security', label: '보안', icon: 'Shield' },
]

// ---- Password Change ----

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ---- Danger Zone ----

export interface DeleteAccountRequest {
  confirmation: string       // "DELETE" 입력 필수
}

export interface ResetDataRequest {
  confirmation: string       // 조직 이름 입력 필수
  orgId: string
}
```

### 2.2 `src/types/index.ts` 수정

```typescript
// 기존 export에 추가
export type {
  CurrencyCode,
  DateFormatType,
  NumberFormatType,
  DashboardPeriod,
  UserPreferences,
  SettingsTab,
  ChangePasswordRequest,
  DeleteAccountRequest,
  ResetDataRequest,
} from './settings'
```

## 3. Zustand Store 확장

### 3.1 `src/lib/store.ts` 수정

```typescript
import { create } from 'zustand'
import type { CurrencyCode, DateFormatType, NumberFormatType, DashboardPeriod } from '@/types/settings'

interface Preferences {
  currency: CurrencyCode
  dateFormat: DateFormatType
  numberFormat: NumberFormatType
  dashboardPeriod: DashboardPeriod
}

interface AppState {
  // 기존 필드 유지
  currentUser: User | null
  currentOrgId: string | null
  sidebarOpen: boolean

  // 신규: 환경설정
  preferences: Preferences
  preferencesLoaded: boolean

  // 기존 actions 유지
  setCurrentUser: (user: User | null) => void
  setCurrentOrgId: (id: string | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  clearSession: () => void

  // 신규 actions
  setPreferences: (prefs: Partial<Preferences>) => void
  setPreferencesLoaded: (loaded: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // 기존 초기값 유지
  currentUser: null,
  currentOrgId: null,
  sidebarOpen: true,

  // 신규 초기값
  preferences: {
    currency: 'USD',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '1,000.00',
    dashboardPeriod: 30,
  },
  preferencesLoaded: false,

  // 기존 actions 유지
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentOrgId: (id) => set({ currentOrgId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  clearSession: () => set({ currentUser: null, currentOrgId: null }),

  // 신규 actions
  setPreferences: (prefs) => set((s) => ({
    preferences: { ...s.preferences, ...prefs },
  })),
  setPreferencesLoaded: (loaded) => set({ preferencesLoaded: loaded }),
}))
```

## 4. Service Layer

### 4.1 `src/services/settings.service.ts` (NEW)

```typescript
import { bkend } from '@/lib/bkend'
import type { UserPreferences } from '@/types/settings'
import { DEFAULT_PREFERENCES } from '@/types/settings'

// ---- Preferences CRUD ----

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const rows = await bkend.get<UserPreferences[]>('/user_preferences', {
    params: { userId },
  })
  if (rows.length > 0) return rows[0]

  // 없으면 기본값으로 생성
  return await bkend.post<UserPreferences>('/user_preferences', {
    userId,
    ...DEFAULT_PREFERENCES,
  })
}

export async function updatePreferences(
  prefsId: string,
  updates: Partial<Pick<UserPreferences, 'currency' | 'dateFormat' | 'numberFormat' | 'dashboardPeriod'>>,
): Promise<UserPreferences> {
  return await bkend.patch<UserPreferences>(`/user_preferences/${prefsId}`, updates)
}

// ---- Data Reset ----

export async function resetOrgData(orgId: string): Promise<{ deleted: number }> {
  // usage_records 삭제 (해당 조직)
  const records = await bkend.get<{ id: string }[]>('/usage_records', {
    params: { orgId },
  })
  let deleted = 0
  for (const r of records) {
    await bkend.delete(`/usage_records/${r.id}`)
    deleted++
  }
  return { deleted }
}

// ---- Account Deletion ----

export async function deleteAccount(userId: string, orgId: string): Promise<void> {
  // 1. usage_records 삭제
  await resetOrgData(orgId)

  // 2. 관련 데이터 삭제 (순서 중요: FK 의존성)
  const tables = [
    'notification_logs',
    'notification_channels',
    'notification_preferences',
    'anomaly_events',
    'anomaly_detection_settings',
    'alerts',
    'budgets',
    'optimization_tips',
    'proxy_logs',
    'proxy_keys',
    'api_keys',
    'providers',
    'projects',
    'members',
  ]

  for (const table of tables) {
    const rows = await bkend.get<{ id: string }[]>(`/${table}`, { params: { orgId } })
    for (const row of rows) {
      await bkend.delete(`/${table}/${row.id}`)
    }
  }

  // 3. 조직 삭제
  await bkend.delete(`/organizations/${orgId}`)

  // 4. 사용자 삭제
  await bkend.delete(`/users/${userId}`)

  // Note: Supabase auth user는 API route에서 admin API로 삭제
}

// ---- API Key Summary ----

export interface ApiKeySummary {
  providerId: string
  providerType: string
  providerName: string
  keyId: string
  label: string
  keyPrefix: string
  isActive: boolean
  lastSyncAt?: string
}

export async function getApiKeySummary(orgId: string): Promise<ApiKeySummary[]> {
  const providers = await bkend.get<{
    id: string; type: string; name: string; lastSyncAt?: string
  }[]>('/providers', { params: { orgId } })

  const summaries: ApiKeySummary[] = []

  for (const p of providers) {
    const keys = await bkend.get<{
      id: string; label: string; keyPrefix: string; isActive: boolean
    }[]>('/api_keys', { params: { providerId: p.id } })

    for (const k of keys) {
      summaries.push({
        providerId: p.id,
        providerType: p.type,
        providerName: p.name,
        keyId: k.id,
        label: k.label,
        keyPrefix: k.keyPrefix,
        isActive: k.isActive,
        lastSyncAt: p.lastSyncAt,
      })
    }
  }

  return summaries
}
```

## 5. API Routes

### 5.1 `src/app/api/settings/preferences/route.ts`

```typescript
// GET /api/settings/preferences
//   - getMeServer() → userId
//   - getPreferences(userId) → UserPreferences
//   - 없으면 DEFAULT로 자동 생성

// PATCH /api/settings/preferences
//   - getMeServer() → userId
//   - body: { currency?, dateFormat?, numberFormat?, dashboardPeriod? }
//   - 유효성 검증:
//     - currency in ['USD','KRW','EUR','JPY']
//     - dateFormat in ['YYYY-MM-DD','MM/DD/YYYY','DD/MM/YYYY']
//     - numberFormat in ['1,000.00','1.000,00']
//     - dashboardPeriod in [7,30,90]
//   - getPreferences(userId) → prefsId
//   - updatePreferences(prefsId, validatedUpdates)
```

### 5.2 `src/app/api/settings/change-password/route.ts`

```typescript
// POST /api/settings/change-password
//   - getMeServer() → userId, email
//   - body: { currentPassword, newPassword }
//   - 유효성 검증:
//     - newPassword.length >= 8
//     - newPassword !== currentPassword
//   - Step 1: 현재 비밀번호 확인
//     - Supabase signInWithPassword(email, currentPassword) 시도
//     - 실패 → 400 "현재 비밀번호가 올바르지 않습니다"
//   - Step 2: Supabase Admin API로 비밀번호 변경
//     - supabaseService.auth.admin.updateUserById(userId, { password: newPassword })
//   - 성공 → 200 { message: "비밀번호가 변경되었습니다" }
```

### 5.3 `src/app/api/settings/account/route.ts`

```typescript
// DELETE /api/settings/account
//   - getMeServer() → userId
//   - body: { confirmation }
//   - confirmation !== "DELETE" → 400 에러
//   - orgId 조회: bkend.get<Organization[]>('/organizations', { params: { ownerId: userId } })
//   - Growth 플랜 체크: subscription 활성 시 → 400 "구독을 먼저 해지해주세요"
//   - deleteAccount(userId, orgId) 호출
//   - Supabase Admin: supabaseService.auth.admin.deleteUser(userId)
//   - 성공 → 200 { message: "계정이 삭제되었습니다" }
```

### 5.4 `src/app/api/settings/data/route.ts`

```typescript
// DELETE /api/settings/data
//   - getMeServer() → userId
//   - body: { confirmation, orgId }
//   - 조직 이름 조회 → confirmation !== orgName → 400 에러
//   - resetOrgData(orgId) 호출
//   - 성공 → 200 { deleted: N }
```

## 6. UI Components

### 6.1 `src/features/settings/components/SettingsTabs.tsx` (NEW)

```
┌────────────────────────────────────────────────────────┐
│  [일반]  [조직]  [알림]  [구독]  [보안]                   │
│  ━━━━━                                                 │
└────────────────────────────────────────────────────────┘
  Desktop: 수평 탭 바 (border-bottom active indicator)
  Mobile: <select> 드롭다운으로 전환 (md: breakpoint)
```

**구현 세부:**
- `'use client'` 컴포넌트
- Props: `activeTab: SettingsTab`, `onTabChange: (tab: SettingsTab) => void`
- `useSearchParams()` + `useRouter().replace()` 로 URL sync
- `<Suspense>` 래핑 필수 (Next.js static generation)
- SETTINGS_TABS 상수로 탭 렌더링
- lucide-react 아이콘: Settings, Building, Bell, CreditCard, Shield
- 활성 탭: `border-b-2 border-blue-600 text-blue-600`
- 비활성 탭: `text-gray-500 hover:text-gray-700`

### 6.2 `src/features/settings/components/GeneralTab.tsx` (NEW)

```
┌─────────────────────────────────────────────────────┐
│ 프로필                                               │
├─────────────────────────────────────────────────────┤
│ 이름:   [John Doe              ]                     │
│ 이메일: john@example.com  (읽기 전용)                 │
│                                   [변경사항 저장]     │
├─────────────────────────────────────────────────────┤
│ 환경설정                                             │
├─────────────────────────────────────────────────────┤
│ 통화 표시:      [USD ▼]                              │
│ 날짜 형식:      [YYYY-MM-DD ▼]                       │
│ 숫자 형식:      [1,000.00 ▼]                         │
│ 대시보드 기간:  [30일 ▼]                              │
│                                   [설정 저장]         │
├─────────────────────────────────────────────────────┤
│ API 키 현황                                          │
├─────────────────────────────────────────────────────┤
│ 🟢 OpenAI   │ sk-...a1b2  │ Production │ 마지막 동기화: 2시간 전  │
│ 🟢 Anthropic │ sk-ant-...  │ Default    │ 마지막 동기화: 1시간 전  │
│ ⚪ Google    │ AIza...     │ Test Key   │ 동기화 안 됨             │
│                                                      │
│              [프로바이더 페이지에서 키 관리 →]           │
└─────────────────────────────────────────────────────┘
```

**구현 세부:**
- `'use client'` 컴포넌트
- 프로필 섹션: 기존 settings/page.tsx의 프로필 폼 코드 이동
- 이메일 필드: `disabled` 속성, 회색 배경
- 환경설정 섹션: `usePreferences()` hook 사용
- 각 설정은 `<select>` 드롭다운으로 구현
- 낙관적 업데이트: 즉시 Zustand store 반영 → 백그라운드 API 호출
- API 키 섹션: `getApiKeySummary()` 로 목록 조회
- PROVIDER_COLORS 상수로 색상 도트 표시
- "프로바이더 페이지에서 키 관리" → Link to `/providers`

### 6.3 `src/features/settings/components/OrganizationTab.tsx` (NEW)

```
┌─────────────────────────────────────────────────────┐
│ 조직 정보                                            │
├─────────────────────────────────────────────────────┤
│ 조직 이름:    [My Company           ]                │
│ URL 슬러그:   [my-company           ]                │
│ 청구 이메일:  [billing@company.com  ]                │
│                              [조직 정보 업데이트]     │
├─────────────────────────────────────────────────────┤
│ 팀 관리                                              │
├─────────────────────────────────────────────────────┤
│ 멤버 초대, 역할 관리, 접근제어를 설정하세요.           │
│                          [팀 관리 페이지로 이동]      │
└─────────────────────────────────────────────────────┘
```

**구현 세부:**
- `'use client'` 컴포넌트
- 기존 settings/page.tsx의 조직 폼 + 팀 링크 코드 이동
- 변경 없음, 탭 컴포넌트로 분리만

### 6.4 `src/features/settings/components/NotificationsTab.tsx` (NEW)

```
┌─────────────────────────────────────────────────────┐
│ 알림 채널                                            │
├─────────────────────────────────────────────────────┤
│ <ChannelManager orgId={orgId} plan={plan} />         │
├─────────────────────────────────────────────────────┤
│ 알림 설정                                            │
├─────────────────────────────────────────────────────┤
│ <NotificationSettings orgId={orgId} plan={plan} />   │
└─────────────────────────────────────────────────────┘
```

**구현 세부:**
- `'use client'` 컴포넌트
- 기존 알림 채널 Card를 그대로 래핑
- ChannelManager, NotificationSettings 임포트하여 렌더링

### 6.5 `src/features/settings/components/SubscriptionTab.tsx` (NEW)

```
┌─────────────────────────────────────────────────────┐
│ 현재 플랜                                            │
├─────────────────────────────────────────────────────┤
│ [Growth 플랜] [활성]    절감액의 20%                  │
│ 다음 결제일: March 15, 2026                          │
│                                                      │
│ [결제 관리]  [플랜 변경]                              │
├─────────────────────────────────────────────────────┤
│ 최근 청구서                                          │
├─────────────────────────────────────────────────────┤
│ Feb 15, 2026  │ $45.00 │ [paid]  │ 🔗               │
│ Jan 15, 2026  │ $38.00 │ [paid]  │ 🔗               │
├─────────────────────────────────────────────────────┤
│ 이번 달 수수료                     (Growth only)      │
├─────────────────────────────────────────────────────┤
│ 요청 수: 1,234  │ 절감액: $89.50  │ 수수료: $17.90   │
└─────────────────────────────────────────────────────┘
```

**구현 세부:**
- `'use client'` 컴포넌트
- 기존 구독 Card + 수수료 Card 코드 이동
- useBilling() hook 동일하게 사용

### 6.6 `src/features/settings/components/SecurityTab.tsx` (NEW)

```
┌─────────────────────────────────────────────────────┐
│ 비밀번호 변경                                        │
├─────────────────────────────────────────────────────┤
│ 현재 비밀번호:  [••••••••          ]                  │
│ 새 비밀번호:    [••••••••          ]                  │
│ 비밀번호 확인:  [••••••••          ]                  │
│                               [비밀번호 변경]         │
│                                                      │
│ 마지막 로그인: 2026-02-17 14:30:00                   │
├─────────────────────────────────────────────────────┤
│ ⚠️ Danger Zone                                       │
├─────────────────────────────────────────────────────┤
│ ┌─ 데이터 초기화 ──────────────────────────────────┐ │
│ │ 조직의 모든 사용량 데이터가 영구 삭제됩니다.       │ │
│ │ 이 작업은 되돌릴 수 없습니다.                      │ │
│ │                               [데이터 초기화]      │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌─ 계정 삭제 ─────────────────────────────────────┐  │
│ │ 계정, 조직, 모든 데이터가 영구 삭제됩니다.        │  │
│ │ Growth 구독이 있는 경우 먼저 해지해야 합니다.     │  │
│ │                                  [계정 삭제]      │  │
│ └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**구현 세부:**
- `'use client'` 컴포넌트
- 비밀번호 변경: POST `/api/settings/change-password`
  - 새 비밀번호 8자 이상 클라이언트 검증
  - 비밀번호 확인 일치 검증
  - 성공 시 toast('success') + 폼 초기화
- Danger Zone: 빨간 border (border-red-200), 빨간 배경 (bg-red-50)
- 데이터 초기화 버튼: ConfirmModal 열기 → 조직 이름 입력 → DELETE /api/settings/data
- 계정 삭제 버튼: ConfirmModal 열기 → "DELETE" 입력 → DELETE /api/settings/account
  - Growth 플랜: 버튼 비활성 + "구독을 먼저 해지해주세요" 안내
  - 삭제 후 → clearAuthCookies() + router.push('/login')
- lucide-react 아이콘: Lock, AlertTriangle, Trash2

### 6.7 `src/features/settings/components/ConfirmModal.tsx` (NEW)

```
┌─────────────────────────────────────────────────┐
│ ⚠️ 계정 삭제                               [X]  │
├─────────────────────────────────────────────────┤
│                                                  │
│ 이 작업은 되돌릴 수 없습니다.                     │
│ 계정, 조직, 모든 데이터가 영구적으로 삭제됩니다.   │
│                                                  │
│ 계속하려면 "DELETE"를 입력하세요:                  │
│ [                                    ]           │
│                                                  │
│            [취소]  [삭제 확인] (disabled until match) │
└─────────────────────────────────────────────────┘
```

**구현 세부:**
- `'use client'` 컴포넌트
- Props:
  ```typescript
  interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmText: string        // 사용자가 입력해야 하는 텍스트
    confirmLabel?: string      // 버튼 레이블 (기본: "확인")
    variant?: 'danger' | 'warning'
    isLoading?: boolean
  }
  ```
- 입력값 === confirmText일 때만 확인 버튼 활성화
- variant='danger': 빨간 확인 버튼
- Portal 렌더링: `createPortal` 사용
- ESC 키 / 오버레이 클릭으로 닫기
- body scroll lock

## 7. Hooks

### 7.1 `src/features/settings/hooks/usePreferences.ts` (NEW)

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import type { UserPreferences } from '@/types/settings'

export function usePreferences() {
  const { currentUser } = useSession()
  const { preferences, setPreferences, preferencesLoaded, setPreferencesLoaded } = useAppStore()
  const [prefsId, setPrefsId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!preferencesLoaded)
  const [isSaving, setIsSaving] = useState(false)

  // 초기 로드: GET /api/settings/preferences
  useEffect(() => {
    if (preferencesLoaded || !currentUser) return
    async function load() {
      try {
        const res = await fetch('/api/settings/preferences')
        if (!res.ok) throw new Error()
        const data: UserPreferences = await res.json()
        setPrefsId(data.id)
        setPreferences({
          currency: data.currency,
          dateFormat: data.dateFormat,
          numberFormat: data.numberFormat,
          dashboardPeriod: data.dashboardPeriod,
        })
        setPreferencesLoaded(true)
      } catch {
        // 기본값 유지
        setPreferencesLoaded(true)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [currentUser, preferencesLoaded, setPreferences, setPreferencesLoaded])

  // 낙관적 업데이트 + 서버 동기화
  const updatePreference = useCallback(
    async (key: string, value: string | number) => {
      // 1. 즉시 Zustand 반영
      setPreferences({ [key]: value })
      // 2. 백그라운드 서버 저장
      setIsSaving(true)
      try {
        await fetch('/api/settings/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        })
      } catch {
        // 실패 시 롤백 가능하나, 낙관적이므로 유지
      } finally {
        setIsSaving(false)
      }
    },
    [setPreferences],
  )

  return {
    preferences,
    prefsId,
    isLoading,
    isSaving,
    updatePreference,
  }
}
```

### 7.2 `src/features/settings/hooks/useApiKeys.ts` (NEW)

```typescript
'use client'
import { useState, useEffect } from 'react'
import type { ApiKeySummary } from '@/services/settings.service'

export function useApiKeys(orgId?: string | null) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setIsLoading(false); return }
    async function load() {
      try {
        // 프로바이더 + API 키를 클라이언트에서 직접 조회
        // (별도 API route 없이 bkend 직접 사용)
        const { getApiKeySummary } = await import('@/services/settings.service')
        const data = await getApiKeySummary(orgId)
        setKeys(data)
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [orgId])

  return { keys, isLoading }
}
```

## 8. Preferences Loader Integration

### 8.1 `src/hooks/useSession.ts` 수정 (또는 별도 useEffect)

앱 최초 로드 시 preferences를 자동 로드하여 Zustand에 세팅:

```typescript
// useSession 내부 또는 layout.tsx에서:
// 로그인 확인 후 → GET /api/settings/preferences → setPreferences()
// preferencesLoaded 플래그로 중복 호출 방지
```

이렇게 하면 대시보드, 리포트 등 모든 페이지에서 `useAppStore(s => s.preferences.currency)` 형태로 접근 가능.

## 9. Environment Variables

```env
# 기존 환경변수 외 추가 없음
# Supabase Admin API (비밀번호 변경, 계정 삭제)는 이미 SUPABASE_SERVICE_ROLE_KEY로 사용 중
```

## 10. Security Considerations

| 항목 | 대응 |
|------|------|
| 비밀번호 변경 | 현재 비밀번호 확인 필수 (signInWithPassword 검증) |
| 계정 삭제 | "DELETE" 타이핑 + Growth 구독 해지 선행 확인 |
| 데이터 초기화 | 조직 이름 타이핑 확인 |
| Admin API 사용 | SUPABASE_SERVICE_ROLE_KEY → 서버 사이드 only |
| CSRF | Next.js Route Handlers는 자동 CSRF 보호 |
| Rate Limiting | 비밀번호 변경 API에 실패 횟수 제한 고려 (향후) |

## 11. Plan Limits

| 기능 | Free | Growth |
|------|------|--------|
| 환경설정 (통화, 날짜 등) | 전체 | 전체 |
| API 키 뷰 | 전체 | 전체 |
| 비밀번호 변경 | 가능 | 가능 |
| 데이터 초기화 | 가능 | 가능 |
| 계정 삭제 | 가능 | 구독 해지 후 가능 |

모든 설정 기능은 Free/Growth 공통. Plan gating 없음.

## 12. Implementation Order

```
Phase 1: Data Layer (타입 + 서비스 + 스토어)
  1. src/types/settings.ts (타입 정의)
  2. src/types/index.ts (export 추가)
  3. src/services/settings.service.ts (Preferences + Data Reset + API Key Summary)
  4. src/lib/store.ts (Zustand preferences 확장)

Phase 2: API Routes
  5. src/app/api/settings/preferences/route.ts (GET/PATCH)
  6. src/app/api/settings/change-password/route.ts (POST)
  7. src/app/api/settings/data/route.ts (DELETE)
  8. src/app/api/settings/account/route.ts (DELETE)

Phase 3: UI Components
  9. src/features/settings/components/ConfirmModal.tsx
  10. src/features/settings/components/SettingsTabs.tsx
  11. src/features/settings/hooks/usePreferences.ts
  12. src/features/settings/hooks/useApiKeys.ts
  13. src/features/settings/components/GeneralTab.tsx
  14. src/features/settings/components/OrganizationTab.tsx
  15. src/features/settings/components/NotificationsTab.tsx
  16. src/features/settings/components/SubscriptionTab.tsx
  17. src/features/settings/components/SecurityTab.tsx

Phase 4: Page Rewrite
  18. src/app/(dashboard)/settings/page.tsx (탭 기반 리라이트)
```

## 13. File Summary

### New Files (14)
| # | File | LOC est. |
|---|------|----------|
| 1 | `src/types/settings.ts` | ~60 |
| 2 | `src/services/settings.service.ts` | ~130 |
| 3 | `src/features/settings/components/ConfirmModal.tsx` | ~100 |
| 4 | `src/features/settings/components/SettingsTabs.tsx` | ~70 |
| 5 | `src/features/settings/hooks/usePreferences.ts` | ~70 |
| 6 | `src/features/settings/hooks/useApiKeys.ts` | ~40 |
| 7 | `src/features/settings/components/GeneralTab.tsx` | ~180 |
| 8 | `src/features/settings/components/OrganizationTab.tsx` | ~80 |
| 9 | `src/features/settings/components/NotificationsTab.tsx` | ~30 |
| 10 | `src/features/settings/components/SubscriptionTab.tsx` | ~150 |
| 11 | `src/features/settings/components/SecurityTab.tsx` | ~200 |
| 12 | `src/app/api/settings/preferences/route.ts` | ~60 |
| 13 | `src/app/api/settings/change-password/route.ts` | ~60 |
| 14 | `src/app/api/settings/account/route.ts` | ~50 |

### Modified Files (4)
| # | File | Change |
|---|------|--------|
| 1 | `src/types/index.ts` | settings 타입 export 추가 |
| 2 | `src/lib/store.ts` | preferences 상태 + actions 추가 |
| 3 | `src/app/(dashboard)/settings/page.tsx` | 탭 기반 전면 리라이트 |
| 4 | `src/app/api/settings/data/route.ts` | NEW (데이터 초기화) |

**Total: 14 new + 3 modified = 17 files, ~1,280 LOC estimated**
