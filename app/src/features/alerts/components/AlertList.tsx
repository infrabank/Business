'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Bell } from 'lucide-react'
import type { Alert, AlertType } from '@/types'

interface AlertListProps {
  alerts: Alert[]
  onMarkRead?: (id: string) => void
}

const typeVariant: Record<AlertType, 'warning' | 'info' | 'danger' | 'default'> = {
  budget_warning: 'warning',
  budget_exceeded: 'danger',
  optimization: 'info',
  anomaly: 'warning',
}

export function AlertList({ alerts, onMarkRead }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400 dark:text-slate-500">
        <Bell className="mx-auto mb-2 h-8 w-8" />
        <p>알림 없음</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((a) => (
        <Card
          key={a.id}
          className={`${a.isRead ? 'opacity-60' : ''} ${!a.isRead && onMarkRead ? 'cursor-pointer' : ''}`}
          onClick={() => !a.isRead && onMarkRead?.(a.id)}
        >
          <CardContent className="flex items-start gap-3 py-4">
            <Bell className={`mt-0.5 h-5 w-5 ${a.isRead ? 'text-gray-300 dark:text-slate-600' : 'text-blue-500'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant={typeVariant[a.type]}>{a.type.replace(/_/g, ' ')}</Badge>
                <span className="font-medium text-gray-900 dark:text-slate-100">{a.title}</span>
                {!a.isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{a.message}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{a.sentAt}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
