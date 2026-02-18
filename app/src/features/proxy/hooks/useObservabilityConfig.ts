'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ObservabilitySettings } from '@/types/proxy'

export function useObservabilityConfig(orgId: string | null) {
  const [config, setConfig] = useState<ObservabilitySettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/proxy/observability?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      } else {
        setConfig(null)
      }
    } catch {
      setConfig(null)
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const saveConfig = useCallback(async (newConfig: ObservabilitySettings): Promise<boolean> => {
    setError(null)
    try {
      const res = await fetch('/api/proxy/observability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, config: newConfig }),
      })
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        return true
      }
      const err = await res.json()
      setError(err.error || 'Failed to save')
      return false
    } catch {
      setError('Network error')
      return false
    }
  }, [orgId])

  const deleteConfig = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/observability?orgId=${orgId}`, { method: 'DELETE' })
      if (res.ok) {
        setConfig(null)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [orgId])

  const testConnection = useCallback(async (testConfig: ObservabilitySettings): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/proxy/observability/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: testConfig }),
      })
      return res.json()
    } catch {
      return { success: false, error: 'Network error' }
    }
  }, [])

  return { config, isLoading, error, saveConfig, deleteConfig, testConnection, refetch: fetchConfig }
}
