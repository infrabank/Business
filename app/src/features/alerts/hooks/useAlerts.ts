'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTokenFromCookie } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { Alert } from '@/types'

export function useAlerts(orgId?: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAlerts = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const token = getTokenFromCookie()
      const data = await bkend.get<Alert[]>('/alerts', {
        token: token || undefined,
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
    const token = getTokenFromCookie()
    if (!token) return
    try {
      await bkend.patch('/alerts/' + alertId, { isRead: true }, { token })
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, isRead: true } : a))
    } catch { /* optimistic update already applied */ }
  }, [])

  const markAllRead = useCallback(async () => {
    const token = getTokenFromCookie()
    if (!token) return
    const unread = alerts.filter((a) => !a.isRead)
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))
    for (const alert of unread) {
      try { await bkend.patch('/alerts/' + alert.id, { isRead: true }, { token }) } catch {}
    }
  }, [alerts])

  return { alerts, isLoading, refetch: fetchAlerts, markAsRead, markAllRead }
}
