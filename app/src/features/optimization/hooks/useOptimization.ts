'use client'

import { useState, useEffect, useCallback } from 'react'
import type { OptimizationTip } from '@/types'

const mockTips: OptimizationTip[] = [
  { id: '1', orgId: '1', category: 'model_downgrade', suggestion: 'Switch gpt-4o to gpt-4o-mini for simple tasks. Potential saving: $230/month.', potentialSaving: 230, status: 'pending', createdAt: new Date().toISOString() },
  { id: '2', orgId: '1', category: 'unused_key', suggestion: '2 unused API keys found. Consider deactivating to reduce risk.', potentialSaving: 0, status: 'pending', createdAt: new Date().toISOString() },
  { id: '3', orgId: '1', category: 'caching', suggestion: 'Enable response caching for repeated queries. Estimated saving: $85/month.', potentialSaving: 85, status: 'pending', createdAt: new Date().toISOString() },
]

export function useOptimization(orgId?: string) {
  const [tips, setTips] = useState<OptimizationTip[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTips = useCallback(async () => {
    setIsLoading(true)
    try {
      if (!orgId) {
        setTips(mockTips)
        return
      }
      const res = await fetch(`/api/optimization/tips?orgId=${orgId}`)
      if (res.ok) setTips(await res.json())
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchTips() }, [fetchTips])

  const applyTip = useCallback(async (tipId: string) => {
    setTips((prev) => prev.map((t) => t.id === tipId ? { ...t, status: 'applied' as const } : t))
  }, [])

  const dismissTip = useCallback(async (tipId: string) => {
    setTips((prev) => prev.map((t) => t.id === tipId ? { ...t, status: 'dismissed' as const } : t))
  }, [])

  return { tips, isLoading, refetch: fetchTips, applyTip, dismissTip }
}
