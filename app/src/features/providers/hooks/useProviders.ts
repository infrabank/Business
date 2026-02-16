'use client'

import { useState, useEffect, useCallback } from 'react'
import { bkend } from '@/lib/bkend'
import { checkProviderLimit } from '@/lib/plan-limits'
import { useAppStore } from '@/lib/store'
import type { Provider, ProviderType, UserPlan } from '@/types'

export interface ValidateKeyResult {
  valid: boolean
  error?: string
  models?: string[]
}

export async function validateApiKey(providerType: ProviderType, apiKey: string): Promise<ValidateKeyResult> {
  try {
    const res = await fetch('/api/providers/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerType, apiKey }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { valid: false, error: data.error || `Validation failed (${res.status})` }
    }
    const data = await res.json()
    if (!data.valid) {
      return { valid: false, error: 'Invalid API key. Please check and try again.' }
    }
    return { valid: true, models: data.models }
  } catch {
    return { valid: false, error: 'Network error. Could not validate key.' }
  }
}

export function useProviders(orgId?: string | null) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchProviders = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const data = await bkend.get<Provider[]>('/providers', {
        params: { orgId }
      })
      setProviders(data)
    } catch {
      setProviders([])
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  const addProvider = useCallback(async (data: { type: ProviderType; name: string; apiKey: string }): Promise<{ success: boolean; error?: string }> => {
    if (!orgId) return { success: false, error: 'No organization selected.' }
    try {
      // 0. Check plan limit
      const currentUser = useAppStore.getState().currentUser
      const plan: UserPlan = (currentUser?.plan as UserPlan) || 'free'
      const limitCheck = checkProviderLimit(plan, providers.length)
      if (!limitCheck.allowed) {
        return { success: false, error: `Provider limit reached (${limitCheck.limit}). Upgrade to ${limitCheck.planRequired} plan.` }
      }

      // 1. Validate key
      const validation = await validateApiKey(data.type, data.apiKey)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // 2. Create provider
      const provider = await bkend.post<Provider>('/providers', {
        orgId, type: data.type, name: data.name, isActive: true
      })

      // 3. Create encrypted API key
      await fetch('/api/providers/encrypt-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id, apiKey: data.apiKey, label: data.name }),
      })

      await fetchProviders()
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add provider.' }
    }
  }, [orgId, providers.length, fetchProviders])

  const updateProvider = useCallback(async (providerId: string, data: Partial<Pick<Provider, 'name' | 'isActive'>>): Promise<{ success: boolean; error?: string }> => {
    try {
      await bkend.patch('/providers/' + providerId, data as Record<string, unknown>)
      await fetchProviders()
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update provider.' }
    }
  }, [fetchProviders])

  const deleteProvider = useCallback(async (providerId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await bkend.delete('/providers/' + providerId, {})
      await fetchProviders()
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete provider.' }
    }
  }, [fetchProviders])

  return { providers, isLoading, refetch: fetchProviders, addProvider, updateProvider, deleteProvider }
}
