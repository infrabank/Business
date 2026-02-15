'use client'

import { useState, useCallback, useEffect } from 'react'
import type { SubscriptionInfo, PaymentHistory } from '@/types/billing'

interface UseBillingResult {
  subscription: SubscriptionInfo | null
  invoices: PaymentHistory[]
  isLoading: boolean
  error: string | null
  createCheckout: (priceId: string) => Promise<void>
  openPortal: () => Promise<void>
  refreshStatus: () => Promise<void>
}

export function useBilling(): UseBillingResult {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [invoices, setInvoices] = useState<PaymentHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/billing/status')
      if (!res.ok) throw new Error('Failed to fetch billing status')
      const data = await res.json()
      setSubscription(data.subscription)
      setInvoices(data.invoices || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const createCheckout = useCallback(async (priceId: string) => {
    try {
      setError(null)
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Checkout failed')
      }
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    }
  }, [])

  const openPortal = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Portal session failed')
      }
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Portal failed')
    }
  }, [])

  return { subscription, invoices, isLoading, error, createCheckout, openPortal, refreshStatus }
}
