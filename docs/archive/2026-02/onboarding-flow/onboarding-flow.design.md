# Design: Onboarding Flow

> Feature: onboarding-flow
> Plan Reference: `docs/01-plan/features/onboarding-flow.plan.md`
> Created: 2026-02-17
> Status: **DRAFT**

## 1. Overview

신규 사용자가 회원가입 후 프로바이더 등록 → API 키 입력/검증 → 첫 동기화까지 5단계 위자드를 통해 안내하는 온보딩 기능. 기존 `useProviders.addProvider()`, `validateApiKey()`, `syncProviderUsage()` 로직을 재사용하여 구현.

## 2. Data Model Changes

### 2.1 users 테이블 필드 추가

```typescript
// 기존 users 테이블에 추가
{
  onboardingCompleted: boolean  // default: false
  onboardingStep: number        // default: 1, range: 1-5
}
```

- `onboardingCompleted`: 온보딩 완료 여부. `true`이면 위자드 미표시
- `onboardingStep`: 마지막으로 완료한 단계. 브라우저 종료 후 복원용

### 2.2 Zustand Store 변경 없음

온보딩 상태는 서버 DB에서 관리하고 `useOnboarding` 훅 내 로컬 state로 처리. 글로벌 store에는 추가하지 않음.

## 3. API Routes

### 3.1 GET/PUT `/api/onboarding` — 온보딩 상태 관리

```typescript
// src/app/api/onboarding/route.ts

// GET: 온보딩 상태 조회
// Auth: getMeServer() required
// Response: { onboardingCompleted: boolean, onboardingStep: number }
export async function GET(request: Request) {
  // 1. getMeServer() → 인증 확인
  // 2. bkend.get<DbUser[]>('users', { params: { id: me.id } })
  // 3. Return { onboardingCompleted, onboardingStep }
  // 4. 사용자 없으면 { onboardingCompleted: false, onboardingStep: 1 }
}

// PUT: 온보딩 상태 업데이트
// Auth: getMeServer() required
// Body: { onboardingCompleted?: boolean, onboardingStep?: number }
// Response: { success: true }
export async function PUT(request: Request) {
  // 1. getMeServer() → 인증 확인
  // 2. Parse body → validate fields
  // 3. bkend.get<DbUser[]>('users', { params: { id: me.id } }) → userId 조회
  // 4. bkend.patch(`users/${dbUser.id}`, updates)
  // 5. Return { success: true }
}
```

**DbUser Interface** (기존 패턴 재사용):
```typescript
interface DbUser {
  id: string
  plan?: string
  orgId?: string
  onboardingCompleted?: boolean
  onboardingStep?: number
}
```

### 3.2 POST `/api/onboarding/validate-key` — API 키 검증

```typescript
// src/app/api/onboarding/validate-key/route.ts

// POST: API 키 유효성 검증
// Auth: getMeServer() required
// Body: { type: ProviderType, apiKey: string }
// Response: { valid: boolean, error?: string, models?: string[] }
export async function POST(request: Request) {
  // 1. getMeServer() → 인증 확인
  // 2. Parse body → validate { type, apiKey }
  // 3. type별 검증 로직:
  //    - openai: fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } })
  //    - anthropic: fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: minimal })
  //    - google: fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  // 4. AbortController with 5s timeout
  // 5. 성공 → { valid: true, models: [...] }
  // 6. 실패 → { valid: false, error: '...' }
}
```

**참고**: 기존 `/api/providers/validate` 엔드포인트가 이미 존재. 온보딩 전용 라우트를 만드는 대신, 기존 엔드포인트를 재사용할 수도 있음. 단, 온보딩 컨텍스트에서의 한국어 에러 메시지 차별화를 위해 별도 라우트 유지.

## 4. Hook: useOnboarding

```typescript
// src/features/onboarding/hooks/useOnboarding.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useProviders } from '@/features/providers/hooks/useProviders'
import type { ProviderType } from '@/types'

interface OnboardingState {
  step: number              // 1-5
  isLoading: boolean
  isCompleted: boolean

  // Step 2 state
  selectedProvider: ProviderType | null

  // Step 3 state
  apiKey: string
  keyStatus: 'idle' | 'validating' | 'valid' | 'invalid'
  keyError: string | null
  keyModels: string[]

  // Step 4 state
  syncStatus: 'idle' | 'syncing' | 'done' | 'error'
  syncSummary: { totalCost: number; totalRequests: number } | null
}

interface UseOnboardingReturn {
  state: OnboardingState

  // Navigation
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void

  // Actions
  selectProvider: (type: ProviderType) => void
  setApiKey: (key: string) => void
  validateKey: () => Promise<boolean>
  registerProvider: () => Promise<boolean>
  startSync: () => Promise<void>
  skipOnboarding: () => Promise<void>
  completeOnboarding: () => Promise<void>
  resetOnboarding: () => Promise<void>

  // Computed
  canProceed: boolean
}

export function useOnboarding(): UseOnboardingReturn {
  // Implementation details below
}
```

### 4.1 Hook 내부 로직

```typescript
// 초기화: GET /api/onboarding → 서버 상태 로드
useEffect(() => {
  fetch('/api/onboarding')
    .then(res => res.json())
    .then(data => {
      if (data.onboardingCompleted) setIsCompleted(true)
      else setStep(data.onboardingStep || 1)
    })
    .finally(() => setIsLoading(false))
}, [])

// 스텝 변경 시 서버에 저장
const updateStep = async (newStep: number) => {
  setStep(newStep)
  await fetch('/api/onboarding', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ onboardingStep: newStep })
  })
}

// API 키 검증: 기존 validateApiKey() 재사용
const validateKey = async (): Promise<boolean> => {
  if (!selectedProvider || !apiKey) return false
  setKeyStatus('validating')
  const result = await validateApiKey(selectedProvider, apiKey)
  if (result.valid) {
    setKeyStatus('valid')
    setKeyModels(result.models || [])
    return true
  } else {
    setKeyStatus('invalid')
    setKeyError(result.error || 'API 키가 유효하지 않습니다')
    return false
  }
}

// 프로바이더 등록: useProviders.addProvider() 재사용
const registerProvider = async (): Promise<boolean> => {
  if (!selectedProvider || !apiKey) return false
  const name = PROVIDER_LABELS[selectedProvider] || selectedProvider
  const result = await addProvider({ type: selectedProvider, name, apiKey })
  return result.success
}

// 첫 동기화 트리거
const startSync = async (): Promise<void> => {
  setSyncStatus('syncing')
  try {
    const res = await fetch('/api/usage/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncType: 'manual' })
    })
    const data = await res.json()
    setSyncStatus('done')
    setSyncSummary(data.summary || null)
  } catch {
    setSyncStatus('done') // 에러여도 진행 가능 (데이터 없을 수 있음)
    setSyncSummary(null)
  }
}

// canProceed 계산
const canProceed = useMemo(() => {
  switch (step) {
    case 1: return true                          // Welcome은 항상 진행 가능
    case 2: return selectedProvider !== null      // 프로바이더 선택 필요
    case 3: return keyStatus === 'valid'          // 키 검증 필요
    case 4: return syncStatus === 'done'          // 동기화 완료 필요
    case 5: return true                          // Complete는 항상 가능
    default: return false
  }
}, [step, selectedProvider, keyStatus, syncStatus])
```

## 5. UI Components

### 5.1 OnboardingWizard (메인 컨테이너)

```typescript
// src/features/onboarding/components/OnboardingWizard.tsx
'use client'

interface OnboardingWizardProps {
  onComplete: () => void  // 완료 시 대시보드 표시
}

// Layout:
// ┌──────────────────────────────────────────────┐
// │  StepIndicator (1 ─── 2 ─── 3 ─── 4 ─── 5)  │
// ├──────────────────────────────────────────────┤
// │                                              │
// │           [Current Step Content]              │
// │                                              │
// ├──────────────────────────────────────────────┤
// │  [← 이전]              [다음 →] / [건너뛰기]  │
// └──────────────────────────────────────────────┘

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { state, nextStep, prevStep, skipOnboarding, completeOnboarding, ...actions } = useOnboarding()

  if (state.isLoading) return <OnboardingSkeleton />

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <StepIndicator currentStep={state.step} totalSteps={5} />

      <div className="mt-8">
        {state.step === 1 && <WelcomeStep />}
        {state.step === 2 && <ProviderStep selectedProvider={state.selectedProvider} onSelect={actions.selectProvider} />}
        {state.step === 3 && <ApiKeyStep provider={state.selectedProvider!} apiKey={state.apiKey} onKeyChange={actions.setApiKey} keyStatus={state.keyStatus} keyError={state.keyError} keyModels={state.keyModels} onValidate={actions.validateKey} onRegister={actions.registerProvider} />}
        {state.step === 4 && <SyncStep syncStatus={state.syncStatus} syncSummary={state.syncSummary} onStartSync={actions.startSync} />}
        {state.step === 5 && <CompleteStep />}
      </div>

      <div className="mt-8 flex items-center justify-between">
        {state.step > 1 ? (
          <Button variant="ghost" onClick={prevStep}>
            <ArrowLeft className="mr-2 h-4 w-4" /> 이전
          </Button>
        ) : <div />}

        <div className="flex items-center gap-3">
          {state.step < 5 && (
            <button
              onClick={skipOnboarding}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              건너뛰기
            </button>
          )}
          {state.step < 5 ? (
            <Button onClick={nextStep} disabled={!canProceed}>
              다음 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => { completeOnboarding(); onComplete() }}>
              대시보드로 이동 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Styling**:
- Container: `mx-auto max-w-2xl px-4 py-8`
- 전체 배경: `bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-screen`
- 카드: `rounded-2xl border border-slate-200/60 bg-white shadow-sm p-6`

### 5.2 StepIndicator (프로그레스 바)

```typescript
// src/features/onboarding/components/StepIndicator.tsx

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

const STEP_LABELS = ['환영', '프로바이더', 'API 키', '동기화', '완료']

// 레이아웃:
// ●───────●───────●───────○───────○
// 환영   프로바이더  API 키  동기화   완료
//
// ● = 완료 (bg-blue-600 + Check icon)
// ● = 현재 (bg-blue-600 + 숫자, ring-4 ring-blue-100)
// ○ = 미완료 (bg-slate-200 + 숫자)
// 연결선: 완료=bg-blue-600, 미완료=bg-slate-200

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1
        const isCompleted = stepNum < currentStep
        const isCurrent = stepNum === currentStep

        return (
          <React.Fragment key={stepNum}>
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all',
                isCompleted && 'bg-blue-600 text-white',
                isCurrent && 'bg-blue-600 text-white ring-4 ring-blue-100',
                !isCompleted && !isCurrent && 'bg-slate-200 text-slate-500'
              )}>
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span className={cn(
                'text-xs font-medium',
                (isCompleted || isCurrent) ? 'text-blue-600' : 'text-slate-400'
              )}>
                {label}
              </span>
            </div>

            {/* Connector line */}
            {stepNum < totalSteps && (
              <div className={cn(
                'h-0.5 flex-1 mx-2',
                stepNum < currentStep ? 'bg-blue-600' : 'bg-slate-200'
              )} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
```

### 5.3 WelcomeStep (Step 1)

```typescript
// src/features/onboarding/components/WelcomeStep.tsx

// 레이아웃:
// ┌──────────────────────────────────┐
// │         🎯 LLM Cost Manager     │
// │                                  │
// │   LLM API 비용을 한곳에서        │
// │   통합 관리하세요                 │
// │                                  │
// │   ┌─────┐  ┌─────┐  ┌─────┐    │
// │   │ 💰  │  │ 📊  │  │ 🔔  │    │
// │   │비용  │  │분석  │  │알림  │    │
// │   │절감  │  │인사이│  │설정  │    │
// │   └─────┘  └─────┘  └─────┘    │
// │                                  │
// │   약 2분이면 설정을 완료할 수     │
// │   있습니다.                       │
// └──────────────────────────────────┘

export function WelcomeStep() {
  const features = [
    { icon: DollarSign, title: '비용 통합 관리', desc: 'OpenAI, Anthropic, Google 비용을 한눈에' },
    { icon: BarChart3, title: '실시간 분석', desc: '사용량 트렌드, 모델별 비교, 최적화 제안' },
    { icon: Bell, title: '예산 알림', desc: '예산 초과 시 즉시 알림, 이상 지출 감지' },
  ]

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
        <Zap className="h-8 w-8 text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">LLM 비용, 이제 똑똑하게 관리하세요</h2>
      <p className="mt-2 text-slate-500">API 비용을 통합 관리하고 최적화할 준비를 해볼까요?</p>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
            <f.icon className="mx-auto h-6 w-6 text-blue-500" />
            <h3 className="mt-2 text-sm font-semibold text-slate-800">{f.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{f.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate-400">약 2분이면 설정을 완료할 수 있습니다</p>
    </div>
  )
}
```

### 5.4 ProviderStep (Step 2)

```typescript
// src/features/onboarding/components/ProviderStep.tsx

interface ProviderStepProps {
  selectedProvider: ProviderType | null
  onSelect: (type: ProviderType) => void
}

const PROVIDERS = [
  {
    type: 'openai' as ProviderType,
    name: 'OpenAI',
    desc: 'GPT-4o, GPT-4, GPT-3.5 Turbo',
    color: '#10A37F',
  },
  {
    type: 'anthropic' as ProviderType,
    name: 'Anthropic',
    desc: 'Claude 4, Claude 3.5, Claude 3',
    color: '#D4A574',
  },
  {
    type: 'google' as ProviderType,
    name: 'Google AI',
    desc: 'Gemini Pro, Gemini Flash',
    color: '#4285F4',
  },
]

// 레이아웃:
// ┌──────────────────────────────────┐
// │  사용 중인 LLM 프로바이더를 선택  │
// │  하세요                          │
// │                                  │
// │  ┌──────────┐                    │
// │  │  ● OpenAI │ ← 선택됨 (ring)  │
// │  │  GPT-4o.. │                    │
// │  └──────────┘                    │
// │  ┌──────────┐                    │
// │  │  Anthropic│                    │
// │  │  Claude.. │                    │
// │  └──────────┘                    │
// │  ┌──────────┐                    │
// │  │  Google   │                    │
// │  │  Gemini.. │                    │
// │  └──────────┘                    │
// │                                  │
// │  💡 여러 프로바이더를 나중에 추가  │
// │  할 수 있습니다                   │
// └──────────────────────────────────┘

export function ProviderStep({ selectedProvider, onSelect }: ProviderStepProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">사용 중인 LLM 프로바이더를 선택하세요</h2>
      <p className="mt-1 text-sm text-slate-500">가장 많이 사용하는 프로바이더 하나를 선택하세요</p>

      <div className="mt-6 space-y-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.type}
            onClick={() => onSelect(p.type)}
            className={cn(
              'flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
              selectedProvider === p.type
                ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${p.color}15` }}
            >
              <div className="h-5 w-5 rounded-full" style={{ backgroundColor: p.color }} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{p.name}</h3>
              <p className="text-sm text-slate-500">{p.desc}</p>
            </div>
            {selectedProvider === p.type && (
              <Check className="h-5 w-5 text-blue-600" />
            )}
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        여러 프로바이더를 나중에 추가할 수 있습니다
      </p>
    </div>
  )
}
```

### 5.5 ApiKeyStep (Step 3)

```typescript
// src/features/onboarding/components/ApiKeyStep.tsx

interface ApiKeyStepProps {
  provider: ProviderType
  apiKey: string
  onKeyChange: (key: string) => void
  keyStatus: 'idle' | 'validating' | 'valid' | 'invalid'
  keyError: string | null
  keyModels: string[]
  onValidate: () => Promise<boolean>
  onRegister: () => Promise<boolean>
}

const API_KEY_GUIDES: Record<ProviderType, { url: string; placeholder: string }> = {
  openai: { url: 'https://platform.openai.com/api-keys', placeholder: 'sk-...' },
  anthropic: { url: 'https://console.anthropic.com/settings/keys', placeholder: 'sk-ant-...' },
  google: { url: 'https://aistudio.google.com/apikey', placeholder: 'AIza...' },
  azure: { url: 'https://portal.azure.com', placeholder: '' },
  custom: { url: '', placeholder: '' },
}

// 레이아웃:
// ┌──────────────────────────────────┐
// │  OpenAI API 키를 입력하세요       │
// │                                  │
// │  ┌───────────────────┐ [검증]    │
// │  │ sk-...            │           │
// │  └───────────────────┘           │
// │  🔗 API 키 발급 가이드           │
// │                                  │
// │  ✅ API 키가 유효합니다           │
// │  사용 가능한 모델: gpt-4o, ...    │
// └──────────────────────────────────┘

export function ApiKeyStep({ provider, apiKey, onKeyChange, keyStatus, keyError, keyModels, onValidate, onRegister }: ApiKeyStepProps) {
  const guide = API_KEY_GUIDES[provider]
  const providerName = PROVIDER_LABELS[provider]
  const [showKey, setShowKey] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleValidateAndRegister = async () => {
    const isValid = await onValidate()
    if (isValid) {
      setIsRegistering(true)
      const success = await onRegister()
      setIsRegistering(false)
      if (success) setRegistered(true)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">
        {providerName} API 키를 입력하세요
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        API 키를 입력하면 자동으로 유효성을 확인하고 등록합니다
      </p>

      <div className="mt-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => onKeyChange(e.target.value)}
              placeholder={guide.placeholder}
              className={cn(
                'w-full rounded-xl border px-4 py-3 pr-10 font-mono text-sm focus:outline-none focus:ring-2',
                keyStatus === 'valid' && 'border-green-400 focus:ring-green-200',
                keyStatus === 'invalid' && 'border-red-400 focus:ring-red-200',
                keyStatus !== 'valid' && keyStatus !== 'invalid' && 'border-slate-300 focus:ring-blue-200'
              )}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            onClick={handleValidateAndRegister}
            disabled={!apiKey || keyStatus === 'validating' || registered}
            className="shrink-0"
          >
            {keyStatus === 'validating' || isRegistering ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 검증 중...</>
            ) : registered ? (
              <><Check className="mr-2 h-4 w-4" /> 등록 완료</>
            ) : (
              '키 검증'
            )}
          </Button>
        </div>

        {guide.url && (
          <a
            href={guide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
          >
            <ExternalLink className="h-3 w-3" /> {providerName} API 키 발급 가이드
          </a>
        )}

        {/* 성공 메시지 */}
        {keyStatus === 'valid' && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="flex items-center gap-2 font-medium text-green-700">
              <Check className="h-5 w-5" /> API 키가 유효합니다
            </p>
            {keyModels.length > 0 && (
              <p className="mt-1 text-sm text-green-600">
                사용 가능한 모델: {keyModels.slice(0, 5).join(', ')}
                {keyModels.length > 5 && ` 외 ${keyModels.length - 5}개`}
              </p>
            )}
          </div>
        )}

        {/* 에러 메시지 */}
        {keyStatus === 'invalid' && keyError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {keyError}
            </p>
            <p className="mt-1 text-xs text-red-500">
              키를 다시 확인하거나 새 키를 발급받아 주세요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 5.6 SyncStep (Step 4)

```typescript
// src/features/onboarding/components/SyncStep.tsx

interface SyncStepProps {
  syncStatus: 'idle' | 'syncing' | 'done' | 'error'
  syncSummary: { totalCost: number; totalRequests: number } | null
  onStartSync: () => Promise<void>
}

// 레이아웃 (동기화 전):
// ┌──────────────────────────────────┐
// │  🔄 첫 사용량 데이터를 가져올까요? │
// │                                  │
// │  프로바이더에서 최근 사용 데이터를  │
// │  동기화합니다.                     │
// │                                  │
// │       [데이터 동기화 시작]         │
// └──────────────────────────────────┘

// 레이아웃 (동기화 중):
// ┌──────────────────────────────────┐
// │  ⏳ 데이터를 가져오고 있습니다...  │
// │                                  │
// │  [=========>          ] 60%      │
// │                                  │
// │  잠시만 기다려 주세요             │
// └──────────────────────────────────┘

// 레이아웃 (완료 - 데이터 있음):
// ┌──────────────────────────────────┐
// │  ✅ 동기화 완료!                  │
// │                                  │
// │  ┌─────────┐  ┌─────────┐       │
// │  │ $12.34  │  │ 1,234   │       │
// │  │ 총 비용  │  │ 요청 수  │       │
// │  └─────────┘  └─────────┘       │
// └──────────────────────────────────┘

// 레이아웃 (완료 - 데이터 없음):
// ┌──────────────────────────────────┐
// │  ✅ 동기화 완료!                  │
// │                                  │
// │  아직 API 사용 이력이 없습니다.   │
// │  괜찮습니다! API를 사용하기 시작   │
// │  하면 자동으로 추적됩니다.         │
// └──────────────────────────────────┘

export function SyncStep({ syncStatus, syncSummary, onStartSync }: SyncStepProps) {
  // Auto-start sync on mount
  useEffect(() => {
    if (syncStatus === 'idle') {
      onStartSync()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (syncStatus === 'idle' || syncStatus === 'syncing') {
    return (
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900">데이터를 가져오고 있습니다</h2>
        <p className="mt-2 text-sm text-slate-500">잠시만 기다려 주세요...</p>
        <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full animate-pulse rounded-full bg-blue-500" style={{ width: '60%' }} />
        </div>
      </div>
    )
  }

  // Done state
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-900">동기화 완료!</h2>

      {syncSummary && (syncSummary.totalCost > 0 || syncSummary.totalRequests > 0) ? (
        <div className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">${syncSummary.totalCost.toFixed(2)}</p>
            <p className="text-sm text-slate-500">총 비용</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{syncSummary.totalRequests.toLocaleString()}</p>
            <p className="text-sm text-slate-500">요청 수</p>
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-sm rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-sm text-blue-700">
            아직 API 사용 이력이 없습니다.
          </p>
          <p className="mt-1 text-xs text-blue-500">
            괜찮습니다! API를 사용하기 시작하면 자동으로 추적됩니다.
          </p>
        </div>
      )}
    </div>
  )
}
```

### 5.7 CompleteStep (Step 5)

```typescript
// src/features/onboarding/components/CompleteStep.tsx

// 레이아웃:
// ┌──────────────────────────────────┐
// │  🎉 설정이 완료되었습니다!        │
// │                                  │
// │  ┌─────┐  ┌─────┐  ┌─────┐     │
// │  │ 💰  │  │ 🔔  │  │ 📊  │     │
// │  │예산  │  │알림  │  │리포트│     │
// │  │설정  │  │설정  │  │확인  │     │
// │  └─────┘  └─────┘  └─────┘     │
// │                                  │
// │  이제 대시보드에서 비용을 관리     │
// │  하세요!                         │
// └──────────────────────────────────┘

const NEXT_ACTIONS = [
  { icon: Wallet, title: '예산 설정', desc: '월별 예산 한도를 설정하세요', href: '/budget' },
  { icon: Bell, title: '알림 설정', desc: '예산 초과 알림을 받으세요', href: '/alerts' },
  { icon: FileText, title: '리포트 확인', desc: '비용 분석 리포트를 확인하세요', href: '/reports' },
]

export function CompleteStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <PartyPopper className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">설정이 완료되었습니다!</h2>
      <p className="mt-2 text-slate-500">이제 LLM 비용을 효율적으로 관리할 준비가 되었습니다</p>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {NEXT_ACTIONS.map((a) => (
          <div
            key={a.title}
            className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/30"
          >
            <a.icon className="mx-auto h-6 w-6 text-blue-500" />
            <h3 className="mt-2 text-sm font-semibold text-slate-800">{a.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 6. Integration (수정 파일)

### 6.1 Dashboard Page 수정

```typescript
// src/app/(dashboard)/dashboard/page.tsx
// 수정: 온보딩 미완료 시 위자드 표시

import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'
import { useOnboarding } from '@/features/onboarding/hooks/useOnboarding'

export default function DashboardPage() {
  const { isReady } = useSession()
  // ... 기존 코드 ...

  // 온보딩 상태 확인
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [onboardingLoaded, setOnboardingLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/onboarding')
      .then(res => res.json())
      .then(data => {
        setShowOnboarding(!data.onboardingCompleted)
        setOnboardingLoaded(true)
      })
      .catch(() => setOnboardingLoaded(true))
  }, [])

  if (!isReady || !onboardingLoaded) return <DashboardSkeleton />

  // 온보딩 미완료 → 위자드 표시
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      </div>
    )
  }

  // 기존 대시보드 렌더링
  return (
    // ... 기존 JSX ...
  )
}
```

### 6.2 useAuth.ts 수정

```typescript
// src/features/auth/hooks/useAuth.ts
// 수정: signup 시 onboardingCompleted 초기값 설정

const signup = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
  setIsLoading(true)
  setError(null)
  try {
    await auth.signup(email, password, name)
    await initSession()

    // 온보딩 초기 상태 설정 (users 테이블에 onboardingCompleted: false 설정)
    // initSession()에서 bkend.post('/users') 또는 기존 user에 patch
    // → 실제로는 bkend에서 users 생성 시 default false로 설정되므로 추가 코드 불필요할 수 있음

    router.push('/dashboard')
    return true
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Signup failed')
    return false
  } finally {
    setIsLoading(false)
  }
}, [initSession, router])
```

**참고**: bkend.ai에서 users 테이블에 `onboardingCompleted` 컬럼을 추가할 때 default value를 `false`로 설정하면, signup 시 별도 코드 없이 자동으로 `false`가 됨. `useAuth.ts`의 수정은 최소화.

### 6.3 Settings Page 수정

```typescript
// src/features/settings/components/GeneralTab.tsx
// 수정: "온보딩 다시 시작" 버튼 추가

// GeneralTab의 하단에 추가:
<div className="mt-8 rounded-xl border border-slate-200 p-4">
  <h3 className="text-sm font-semibold text-slate-700">온보딩</h3>
  <p className="mt-1 text-sm text-slate-500">초기 설정 위자드를 다시 실행합니다</p>
  <Button
    variant="outline"
    size="sm"
    className="mt-3"
    onClick={async () => {
      await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: false, onboardingStep: 1 })
      })
      router.push('/dashboard')
    }}
  >
    <RotateCcw className="mr-2 h-4 w-4" /> 온보딩 다시 시작
  </Button>
</div>
```

## 7. Implementation Order

| Phase | Files | Description | Est. LOC |
|-------|-------|-------------|----------|
| Phase 1 | `api/onboarding/route.ts`, `api/onboarding/validate-key/route.ts` | API 라우트 구현 | ~120 |
| Phase 2 | `hooks/useOnboarding.ts` | 상태 관리 훅 | ~180 |
| Phase 3 | `StepIndicator.tsx`, `WelcomeStep.tsx`, `ProviderStep.tsx` | 공통 UI + Step 1-2 | ~180 |
| Phase 4 | `ApiKeyStep.tsx`, `SyncStep.tsx`, `CompleteStep.tsx` | Step 3-5 | ~220 |
| Phase 5 | `OnboardingWizard.tsx` | 메인 위자드 컨테이너 | ~100 |
| Phase 6 | `dashboard/page.tsx`, `GeneralTab.tsx`, `useAuth.ts` | 통합 + 수정 | ~60 |

**Total**: ~860 LOC, 10 new files, 3 modified files

## 8. Error Handling

| Scenario | Handling |
|----------|----------|
| API 키 검증 실패 | 에러 메시지 표시 + 재시도 가능 |
| API 키 검증 타임아웃 | "서버 응답이 없습니다. 다시 시도해 주세요" |
| 프로바이더 등록 실패 | "등록에 실패했습니다" + 재시도 |
| 동기화 실패 | 에러를 무시하고 "데이터 없음" 상태로 진행 |
| 네트워크 오류 | "인터넷 연결을 확인해 주세요" |
| 서버에서 온보딩 상태 로드 실패 | 기본값 (step 1, not completed)으로 시작 |

## 9. Security

| Item | Implementation |
|------|----------------|
| API 키 노출 방지 | `type="password"` + 마스킹, 서버 전송 후 클라이언트에서 즉시 폐기 |
| 인증 필수 | 모든 API 라우트에 `getMeServer()` 체크 |
| 소유권 확인 | 온보딩 상태는 본인 user 레코드만 수정 가능 |
| XSS 방지 | 모든 사용자 입력은 plain text로 렌더링 |
| API 키 저장 | 기존 `encrypt-key` 엔드포인트 재사용 (AES-256 암호화) |

## 10. Responsive Design

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 640px) | 단일 컬럼, 카드 세로 배치, 터치 친화적 버튼 크기 |
| Tablet (640-1024px) | 2컬럼 그리드 (WelcomeStep, CompleteStep의 feature cards) |
| Desktop (> 1024px) | max-w-2xl 중앙 정렬, 3컬럼 그리드 |
