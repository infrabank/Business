'use client'

import { useState, useEffect, useCallback } from 'react'
import { bkend } from '@/lib/bkend'
import type { OptimizationTip } from '@/types'

export function useOptimization(orgId?: string | null) {
  const [tips, setTips] = useState<OptimizationTip[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTips = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const data = await bkend.get<OptimizationTip[]>('/optimization-tips', {
        params: { orgId }
      })
      setTips(data)
    } catch {
      setTips([])
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchTips() }, [fetchTips])

  const applyTip = useCallback(async (tipId: string) => {
    try {
      await bkend.patch('/optimization-tips/' + tipId, { status: 'applied' })
      setTips((prev) => prev.map((t) => t.id === tipId ? { ...t, status: 'applied' as const } : t))
    } catch {}
  }, [])

  const dismissTip = useCallback(async (tipId: string) => {
    try {
      await bkend.patch('/optimization-tips/' + tipId, { status: 'dismissed' })
      setTips((prev) => prev.map((t) => t.id === tipId ? { ...t, status: 'dismissed' as const } : t))
    } catch {}
  }, [])

  return { tips, isLoading, refetch: fetchTips, applyTip, dismissTip }
}
