'use client'

import { useState, useEffect, useCallback } from 'react'
import { bkend } from '@/lib/bkend'
import type { Budget } from '@/types'

export function useBudgets(orgId?: string | null) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchBudgets = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const data = await bkend.get<Budget[]>('/budgets', {
        params: { orgId }
      })
      setBudgets(data)
    } catch {
      setBudgets([])
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  const createBudget = useCallback(async (data: { amount: number; name: string; projectId?: string }) => {
    if (!orgId) return false
    try {
      await bkend.post('/budgets', {
        orgId,
        amount: data.amount,
        alertThresholds: [50, 80, 100],
        period: 'monthly',
        isActive: true,
      })
      await fetchBudgets()
      return true
    } catch { return false }
  }, [orgId, fetchBudgets])

  const updateBudget = useCallback(async (budgetId: string, data: Partial<Budget>) => {
    try {
      await bkend.patch('/budgets/' + budgetId, data as Record<string, unknown>)
      await fetchBudgets()
      return true
    } catch { return false }
  }, [fetchBudgets])

  return { budgets, isLoading, refetch: fetchBudgets, createBudget, updateBudget }
}
