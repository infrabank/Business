'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BudgetStatus } from '@/types'

const mockBudgetStatuses: BudgetStatus[] = [
  { budgetId: '1', name: 'Total Monthly Budget', amount: 5000, spent: 2847.53, percentage: 56.9 },
  { budgetId: '2', name: 'Production Project', amount: 3000, spent: 1842.30, percentage: 61.4 },
  { budgetId: '3', name: 'Development', amount: 1000, spent: 653.18, percentage: 65.3 },
]

export function useBudgets(orgId?: string) {
  const [budgets, setBudgets] = useState<BudgetStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true)
    try {
      if (!orgId) {
        setBudgets(mockBudgetStatuses)
        return
      }
      const res = await fetch(`/api/budgets?orgId=${orgId}`)
      if (res.ok) setBudgets(await res.json())
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  return { budgets, isLoading, refetch: fetchBudgets }
}
