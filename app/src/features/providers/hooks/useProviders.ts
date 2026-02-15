'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Provider, ApiKey, ProviderType } from '@/types'

const mockProviders: Provider[] = [
  { id: '1', orgId: '1', type: 'openai', name: 'Production OpenAI', isActive: true, lastSyncAt: '2026-02-15T08:30:00Z', createdAt: '2026-01-10' },
  { id: '2', orgId: '1', type: 'anthropic', name: 'Anthropic Claude', isActive: true, lastSyncAt: '2026-02-15T08:25:00Z', createdAt: '2026-01-12' },
  { id: '3', orgId: '1', type: 'google', name: 'Google AI', isActive: true, lastSyncAt: '2026-02-14T22:00:00Z', createdAt: '2026-01-20' },
]

export function useProviders(orgId?: string) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchProviders = useCallback(async () => {
    setIsLoading(true)
    try {
      if (!orgId) {
        setProviders(mockProviders)
        return
      }
      const res = await fetch(`/api/providers?orgId=${orgId}`)
      if (res.ok) setProviders(await res.json())
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  const addProvider = useCallback(async (data: { type: ProviderType; name: string; apiKey: string }) => {
    const res = await fetch('/api/providers/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerType: data.type, apiKey: data.apiKey }),
    })
    return res.ok
  }, [])

  return { providers, isLoading, refetch: fetchProviders, addProvider }
}
