'use client'

import { useCallback } from 'react'
import { useAnalyticsContext } from '../providers/AnalyticsProvider'

export function useAnalytics() {
  const { track } = useAnalyticsContext()

  const trackFeature = useCallback(
    (name: string, metadata?: Record<string, unknown>) => {
      track({ type: 'feature_use', name, metadata })
    },
    [track],
  )

  const trackClick = useCallback(
    (name: string, metadata?: Record<string, unknown>) => {
      track({ type: 'button_click', name, metadata })
    },
    [track],
  )

  const trackOnboarding = useCallback(
    (step: string, metadata?: Record<string, unknown>) => {
      track({ type: 'onboarding_step', name: step, metadata })
    },
    [track],
  )

  return { track, trackFeature, trackClick, trackOnboarding }
}
