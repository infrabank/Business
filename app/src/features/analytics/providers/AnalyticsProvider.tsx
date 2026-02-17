'use client'

import { createContext, useContext, useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import type { TrackEvent } from '@/types/analytics'

interface AnalyticsContextValue {
  track: (event: TrackEvent) => void
}

const AnalyticsContext = createContext<AnalyticsContextValue>({ track: () => {} })

function generateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem('analytics_sid')
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem('analytics_sid', sid)
  }
  return sid
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const queueRef = useRef<TrackEvent[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const sessionIdRef = useRef<string>('')
  const pageEnterRef = useRef<number>(Date.now())

  // Initialize session ID on client
  useEffect(() => {
    sessionIdRef.current = generateSessionId()
  }, [])

  const flush = useCallback(async () => {
    const events = queueRef.current.splice(0)
    if (events.length === 0 || !sessionIdRef.current) return

    const body = JSON.stringify({
      events,
      sessionId: sessionIdRef.current,
    })

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        '/api/analytics/events',
        new Blob([body], { type: 'application/json' }),
      )
      if (sent) return
    }

    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    } catch {
      // Silent fail — analytics should never break the app
    }
  }, [])

  const track = useCallback(
    (event: TrackEvent) => {
      queueRef.current.push({
        ...event,
        metadata: { ...event.metadata, timestamp: new Date().toISOString() },
      })

      if (queueRef.current.length >= 10) {
        flush()
      } else {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(flush, 5000)
      }
    },
    [flush],
  )

  // Auto page_view tracking
  useEffect(() => {
    pageEnterRef.current = Date.now()
    track({ type: 'page_view', name: pathname })

    return () => {
      const duration = Math.round((Date.now() - pageEnterRef.current) / 1000)
      if (duration > 0) {
        queueRef.current.push({
          type: 'page_view',
          name: pathname,
          metadata: { duration, action: 'leave' },
        })
      }
    }
  }, [pathname, track])

  // Session start + cleanup
  useEffect(() => {
    track({ type: 'session_start', name: 'session' })

    const handleUnload = () => {
      track({ type: 'session_end', name: 'session' })
      flush()
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [track, flush])

  // Periodic flush
  useEffect(() => {
    const interval = setInterval(flush, 5000)
    return () => clearInterval(interval)
  }, [flush])

  return (
    <AnalyticsContext.Provider value={{ track }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export const useAnalyticsContext = () => useContext(AnalyticsContext)
