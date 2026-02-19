'use client'

import { useState, useEffect } from 'react'

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

export function useApiKeys(orgId?: string | null) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false)
      return
    }
    async function load() {
      try {
        const res = await fetch(`/api/settings/api-keys?orgId=${orgId}`)
        if (res.ok) {
          const data = await res.json()
          setKeys(data)
        }
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
