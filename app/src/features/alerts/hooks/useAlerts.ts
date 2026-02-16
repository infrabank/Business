'use client'

import { useState, useEffect, useCallback } from 'react'
import { bkend } from '@/lib/bkend'
import type { Alert } from '@/types'

export function useAlerts(orgId?: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAlerts = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const data = await bkend.get<Alert[]>('/alerts', {
        params: { orgId }
      })
      setAlerts(data)
    } catch {
      setAlerts([])
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const markAsRead = useCallback(async (alertId: string) => {
    try {
      await bkend.patch('/alerts/' + alertId, { isRead: true })
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, isRead: true } : a))
    } catch { /* optimistic update already applied */ }
  }, [])

  const markAllRead = useCallback(async () => {
    const unread = alerts.filter((a) => !a.isRead)
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))
    for (const alert of unread) {
      try { await bkend.patch('/alerts/' + alert.id, { isRead: true }) } catch {}
    }
  }, [alerts])

  return { alerts, isLoading, refetch: fetchAlerts, markAsRead, markAllRead }
}
