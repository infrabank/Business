'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useProviders, validateApiKey } from '@/features/providers/hooks/useProviders'
import { PROVIDER_LABELS } from '@/lib/constants'
import type { ProviderType } from '@/types'

interface SyncSummary {
  totalCost: number
  totalRequests: number
}

interface OnboardingState {
  step: number
  isLoading: boolean
  isCompleted: boolean
  selectedProvider: ProviderType | null
  apiKey: string
  keyStatus: 'idle' | 'validating' | 'valid' | 'invalid'
  keyError: string | null
  keyModels: string[]
  providerRegistered: boolean
  syncStatus: 'idle' | 'syncing' | 'done' | 'error'
  syncSummary: SyncSummary | null
}

interface UseOnboardingReturn {
  state: OnboardingState
  nextStep: () => void
  prevStep: () => void
  selectProvider: (type: ProviderType) => void
  setApiKey: (key: string) => void
  validateKey: () => Promise<boolean>
  registerProvider: () => Promise<boolean>
  startSync: () => Promise<void>
  skipOnboarding: () => Promise<void>
  completeOnboarding: () => Promise<void>
  canProceed: boolean
}

async function updateOnboardingServer(data: { onboardingCompleted?: boolean; onboardingStep?: number }) {
  await fetch('/api/onboarding', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function useOnboarding(): UseOnboardingReturn {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)

  // Step 2
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null)

  // Step 3
  const [apiKey, setApiKeyState] = useState('')
  const [keyStatus, setKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [keyError, setKeyError] = useState<string | null>(null)
  const [keyModels, setKeyModels] = useState<string[]>([])
  const [providerRegistered, setProviderRegistered] = useState(false)

  // Step 4
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null)

  const orgId = useAppStore((s) => s.currentOrgId)
  const { addProvider } = useProviders(orgId)

  // Load onboarding status from server
  useEffect(() => {
    fetch('/api/onboarding')
      .then((res) => res.json())
      .then((data) => {
        if (data.onboardingCompleted) {
          setIsCompleted(true)
        } else {
          setStep(data.onboardingStep || 1)
        }
      })
      .catch(() => {
        // Default: show onboarding from step 1
      })
      .finally(() => setIsLoading(false))
  }, [])

  const nextStep = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, 5)
      updateOnboardingServer({ onboardingStep: next })
      return next
    })
  }, [])

  const prevStep = useCallback(() => {
    setStep((prev) => {
      const next = Math.max(prev - 1, 1)
      updateOnboardingServer({ onboardingStep: next })
      return next
    })
  }, [])

  const selectProvider = useCallback((type: ProviderType) => {
    setSelectedProvider(type)
    // Reset key state when provider changes
    setApiKeyState('')
    setKeyStatus('idle')
    setKeyError(null)
    setKeyModels([])
    setProviderRegistered(false)
  }, [])

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key)
    if (keyStatus !== 'idle') {
      setKeyStatus('idle')
      setKeyError(null)
      setKeyModels([])
      setProviderRegistered(false)
    }
  }, [keyStatus])

  const validateKey = useCallback(async (): Promise<boolean> => {
    if (!selectedProvider || !apiKey) return false
    setKeyStatus('validating')
    setKeyError(null)

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
  }, [selectedProvider, apiKey])

  const registerProvider = useCallback(async (): Promise<boolean> => {
    if (!selectedProvider || !apiKey) return false
    const name = PROVIDER_LABELS[selectedProvider] || selectedProvider
    const result = await addProvider({ type: selectedProvider, name, apiKey })
    if (result.success) {
      setProviderRegistered(true)
      return true
    }
    setKeyError(result.error || '프로바이더 등록에 실패했습니다')
    return false
  }, [selectedProvider, apiKey, addProvider])

  const startSync = useCallback(async (): Promise<void> => {
    if (!orgId) {
      setSyncStatus('done')
      return
    }
    setSyncStatus('syncing')
    try {
      const res = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, syncType: 'manual' }),
      })
      const data = await res.json()

      // Calculate summary from sync results
      if (data.sync && Array.isArray(data.sync)) {
        let totalCost = 0
        let totalRequests = 0
        for (const result of data.sync) {
          totalCost += result.totalCost || 0
          totalRequests += result.recordsCreated || 0
        }
        setSyncSummary({ totalCost, totalRequests })
      }
      setSyncStatus('done')
    } catch {
      setSyncStatus('done')
      setSyncSummary(null)
    }
  }, [orgId])

  const skipOnboarding = useCallback(async () => {
    await updateOnboardingServer({ onboardingCompleted: true })
    setIsCompleted(true)
  }, [])

  const completeOnboarding = useCallback(async () => {
    await updateOnboardingServer({ onboardingCompleted: true, onboardingStep: 5 })
    setIsCompleted(true)
  }, [])

  const canProceed = useMemo(() => {
    switch (step) {
      case 1: return true
      case 2: return selectedProvider !== null
      case 3: return providerRegistered
      case 4: return syncStatus === 'done'
      case 5: return true
      default: return false
    }
  }, [step, selectedProvider, providerRegistered, syncStatus])

  const state: OnboardingState = {
    step,
    isLoading,
    isCompleted,
    selectedProvider,
    apiKey,
    keyStatus,
    keyError,
    keyModels,
    providerRegistered,
    syncStatus,
    syncSummary,
  }

  return {
    state,
    nextStep,
    prevStep,
    selectProvider,
    setApiKey,
    validateKey,
    registerProvider,
    startSync,
    skipOnboarding,
    completeOnboarding,
    canProceed,
  }
}
