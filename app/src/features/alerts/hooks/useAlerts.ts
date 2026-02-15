'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Alert } from '@/types'

const mockAlerts: Alert[] = [
  { id: '1', orgId: '1', type: 'budget_warning', title: 'Production budget at 61%', message: 'Production project has used 61.4% of the $3,000 monthly budget.', isRead: false, sentAt: new Date().toISOString() },
  { id: '2', orgId: '1', type: 'optimization', title: 'Cost optimization available', message: 'Switching gpt-4o to gpt-4o-mini for simple tasks could save ~$230/month.', isRead: false, sentAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', orgId: '1', type: 'anomaly', title: 'Unusual spending detected', message: 'API usage spiked 340% compared to the average.', isRead: true, sentAt: new Date(Date.now() - 86400000 * 2).toISOString() },
]

export function useAlerts(orgId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true)
    try {
      if (!orgId) {
        setAlerts(mockAlerts)
        return
      }
      const res = await fetch(`/api/alerts?orgId=${orgId}`)
      if (res.ok) setAlerts(await res.json())
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const markAsRead = useCallback(async (alertId: string) => {
    setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, isRead: true } : a))
  }, [])

  return { alerts, isLoading, refetch: fetchAlerts, markAsRead }
}
