'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AnomalyDetectionSettings } from '@/types/anomaly'

export function useAnomalySettings(orgId?: string | null) {
  const [settings, setSettings] = useState<AnomalyDetectionSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/anomaly/settings?orgId=${orgId}`)
      if (res.ok) setSettings(await res.json())
    } catch {
      setSettings(null)
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const updateSettings = useCallback(async (
    updates: Partial<Pick<AnomalyDetectionSettings, 'enabled' | 'sensitivity' | 'dailyCostDetection' | 'hourlySpikeDetection' | 'modelAnomalyDetection'>>
  ) => {
    if (!settings) return
    setSettings((prev) => prev ? { ...prev, ...updates } : prev)
    try {
      const res = await fetch('/api/anomaly/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingsId: settings.id, ...updates }),
      })
      if (res.ok) setSettings(await res.json())
    } catch {
      fetchSettings()
    }
  }, [settings, fetchSettings])

  return { settings, isLoading, updateSettings, refetch: fetchSettings }
}
