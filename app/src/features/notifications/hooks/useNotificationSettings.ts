'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NotificationPreferences, NotificationLog } from '@/types/notification'

export function useNotificationSettings(orgId?: string | null) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const [prefsRes, logsRes] = await Promise.all([
        fetch(`/api/notifications/preferences?orgId=${orgId}`),
        fetch(`/api/notifications/logs?orgId=${orgId}&days=30`),
      ])
      if (prefsRes.ok) setPreferences(await prefsRes.json())
      if (logsRes.ok) setLogs(await logsRes.json())
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const updatePreferences = useCallback(async (
    updates: Partial<Pick<NotificationPreferences, 'enabled' | 'digestEnabled' | 'digestTime' | 'timezone' | 'deliveryMode'>>,
  ) => {
    if (!preferences) return
    const res = await fetch('/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefsId: preferences.id, ...updates }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPreferences(updated)
    }
  }, [preferences])

  return { preferences, logs, isLoading, updatePreferences, refetch: fetchAll }
}
