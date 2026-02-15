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
    } catch {
      setProviders([])
    } finally {
      setIsLoading(false)
    }
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
      await fetch('/api/providers/encrypt-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ providerId: provider.id, apiKey: data.apiKey, label: data.name }),
      })

      await fetchProviders()
      return true
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
