'use client'

import { useState, useEffect } from 'react'
import type { ApiKeySummary } from '@/services/settings.service'

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
        const { getApiKeySummary } = await import('@/services/settings.service')
        const data = await getApiKeySummary(orgId!)
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
