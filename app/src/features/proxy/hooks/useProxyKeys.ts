'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProxyKeyDisplay, CreateProxyKeyRequest } from '@/types/proxy'

export function useProxyKeys(orgId: string | null) {
  const [keys, setKeys] = useState<ProxyKeyDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    if (!orgId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/proxy-keys?orgId=${orgId}`)
      if (!res.ok) throw new Error('Failed to fetch proxy keys')
      const data = await res.json()
      setKeys(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load keys')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const createKey = async (data: CreateProxyKeyRequest): Promise<{ proxyKey: string } | null> => {
    if (!orgId) return null
    try {
      const res = await fetch('/api/proxy-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, orgId }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create proxy key')
      }
      const result = await res.json()
      await fetchKeys()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key')
      return null
    }
  }

  const toggleKey = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/proxy-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Failed to update proxy key')
      await fetchKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update key')
    }
  }

  const removeKey = async (id: string) => {
    try {
      const res = await fetch(`/api/proxy-keys/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete proxy key')
      await fetchKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete key')
    }
  }

  return { keys, loading, error, createKey, toggleKey, removeKey, refetch: fetchKeys }
}
