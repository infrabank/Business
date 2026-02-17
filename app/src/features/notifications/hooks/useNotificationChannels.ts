'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NotificationChannel, ChannelType, EmailConfig, SlackConfig, WebhookConfig } from '@/types/notification'

export function useNotificationChannels(orgId?: string | null) {
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/notifications/channels?orgId=${orgId}`)
      if (res.ok) {
        setChannels(await res.json())
      }
    } catch {
      setChannels([])
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchChannels() }, [fetchChannels])

  const createChannel = useCallback(async (data: {
    type: ChannelType
    name: string
    config: EmailConfig | SlackConfig | WebhookConfig
    alertTypes: string[]
    severityFilter?: string[]
  }) => {
    const res = await fetch('/api/notifications/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, ...data }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create channel')
    }
    await fetchChannels()
    return res.json()
  }, [orgId, fetchChannels])

  const updateChannel = useCallback(async (
    id: string,
    channelType: ChannelType,
    updates: Partial<Pick<NotificationChannel, 'name' | 'enabled' | 'config' | 'alertTypes' | 'severityFilter'>>,
  ) => {
    const res = await fetch(`/api/notifications/channels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelType, ...updates }),
    })
    if (res.ok) await fetchChannels()
  }, [fetchChannels])

  const removeChannel = useCallback(async (id: string) => {
    const res = await fetch(`/api/notifications/channels/${id}`, { method: 'DELETE' })
    if (res.ok) await fetchChannels()
  }, [fetchChannels])

  const testChannel = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`/api/notifications/channels/${id}/test`, { method: 'POST' })
    return res.json()
  }, [])

  return { channels, isLoading, createChannel, updateChannel, removeChannel, testChannel, refetch: fetchChannels }
}
