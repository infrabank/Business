'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useAppStore } from '@/lib/store'
import { useBilling } from '@/features/billing/hooks/useBilling'
import { ChannelManager } from '@/features/notifications/components/ChannelManager'
import { NotificationSettings } from '@/features/notifications/components/NotificationSettings'
import { Bell } from 'lucide-react'

export function NotificationsTab() {
  const orgId = useAppStore((s) => s.currentOrgId)
  const currentUser = useAppStore((s) => s.currentUser)
  const { subscription } = useBilling()
  const plan = subscription?.plan || currentUser?.plan || 'free'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-400 dark:text-slate-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">알림 채널</h2>
        </div>
      </CardHeader>
      <CardContent>
        <ChannelManager orgId={orgId} plan={plan as 'free' | 'growth'} />
        <NotificationSettings orgId={orgId} plan={plan as 'free' | 'growth'} />
      </CardContent>
    </Card>
  )
}
