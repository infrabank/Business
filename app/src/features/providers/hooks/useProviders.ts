'use client'

import { useState, useEffect, useCallback } from 'react'
import { bkend } from '@/lib/bkend'
import { checkProviderLimit } from '@/lib/plan-limits'
import { useAppStore } from '@/lib/store'
import type { Provider, ProviderType, UserPlan } from '@/types'

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

  const addProvider = useCallback(async (data: { type: ProviderType; name: string; apiKey: string }) => {
    if (!orgId) return false
    try {
      // 0. Check plan limit
      const currentUser = useAppStore.getState().currentUser
      const plan = (currentUser?.plan || 'free') as UserPlan
      const limitCheck = checkProviderLimit(plan, providers.length)
      if (!limitCheck.allowed) {
        throw new Error(`Provider limit reached (${limitCheck.limit}). Upgrade to ${limitCheck.planRequired} plan.`)
      }

      // 1. Validate key
      const validateRes = await fetch('/api/providers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerType: data.type, apiKey: data.apiKey }),
      })
      if (!validateRes.ok) return false
      const validateData = await validateRes.json()
      if (!validateData.valid) return false

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
      return true
    } catch { return false }
  }, [orgId, fetchProviders])

  const deleteProvider = useCallback(async (providerId: string) => {
    try {
      await bkend.delete('/providers/' + providerId, {})
      await fetchProviders()
      return true
    } catch { return false }
  }, [fetchProviders])

  return { providers, isLoading, refetch: fetchProviders, addProvider, deleteProvider }
}
