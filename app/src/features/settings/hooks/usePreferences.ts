'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import type { UserPreferences } from '@/types/settings'

export function usePreferences() {
  const { currentUser } = useSession()
  const preferences = useAppStore((s) => s.preferences)
  const preferencesLoaded = useAppStore((s) => s.preferencesLoaded)
  const setPreferences = useAppStore((s) => s.setPreferences)
  const setPreferencesLoaded = useAppStore((s) => s.setPreferencesLoaded)
  const [prefsId, setPrefsId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!preferencesLoaded)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (preferencesLoaded || !currentUser) return
    async function load() {
      try {
        const res = await fetch('/api/settings/preferences')
        if (!res.ok) throw new Error()
        const data: UserPreferences = await res.json()
        setPrefsId(data.id)
        setPreferences({
          currency: data.currency,
          dateFormat: data.dateFormat,
          numberFormat: data.numberFormat,
          dashboardPeriod: data.dashboardPeriod,
        })
        setPreferencesLoaded(true)
      } catch {
        setPreferencesLoaded(true)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [currentUser, preferencesLoaded, setPreferences, setPreferencesLoaded])

  const updatePreference = useCallback(
    async (key: string, value: string | number) => {
      setPreferences({ [key]: value })
      setIsSaving(true)
      try {
        await fetch('/api/settings/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        })
      } catch {
        // optimistic - keep value
      } finally {
        setIsSaving(false)
      }
    },
    [setPreferences],
  )

  return { preferences, prefsId, isLoading, isSaving, updatePreference }
}
