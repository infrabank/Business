'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Bell, CheckCircle } from 'lucide-react'
import { useAlerts } from '@/features/alerts/hooks/useAlerts'
import { AnomalyDetailPanel } from '@/features/anomaly/components/AnomalyDetailPanel'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import type { Alert } from '@/types'

const typeVariant: Record<string, 'warning' | 'info' | 'danger' | 'default'> = {
  budget_warning: 'warning',
  budget_exceeded: 'danger',
  optimization: 'info',
  anomaly: 'warning',
}

export default function AlertsPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { alerts, isLoading, markAsRead, markAllRead } = useAlerts(orgId)
  const [selectedAnomaly, setSelectedAnomaly] = useState<Alert | null>(null)

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">알림</h1>
          <p className="text-gray-500">알림 및 경고</p>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">알림</h1>
          <p className="text-gray-500">알림 및 경고</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          <CheckCircle className="mr-2 h-4 w-4" /> 모두 읽음 처리
        </Button>
      </div>

      {/* Anomaly detail panel */}
      {selectedAnomaly && selectedAnomaly.type === 'anomaly' && (
        <AnomalyDetailPanel
          alert={selectedAnomaly}
          onSuppress={async (pattern) => {
            await fetch('/api/anomaly/suppress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orgId, pattern }),
            })
            setSelectedAnomaly(null)
          }}
          onClose={() => setSelectedAnomaly(null)}
        />
      )}

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">알림이 없습니다. 예산 임계값에 도달하면 알림이 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card
              key={a.id}
              className={`${a.isRead ? 'opacity-60' : 'cursor-pointer'} ${
                selectedAnomaly?.id === a.id ? 'ring-2 ring-amber-400' : ''
              }`}
              onClick={() => {
                if (a.type === 'anomaly') {
                  setSelectedAnomaly(selectedAnomaly?.id === a.id ? null : a)
                }
                if (!a.isRead) markAsRead(a.id)
              }}
            >
              <CardContent className="flex items-start gap-3 py-4">
                <Bell className={`mt-0.5 h-5 w-5 ${a.isRead ? 'text-gray-300' : 'text-blue-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={typeVariant[a.type] ?? 'default'}>{a.type.replace(/_/g, ' ')}</Badge>
                    <span className="font-medium text-gray-900">{a.title}</span>
                    {!a.isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{a.message}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(a.sentAt).toLocaleString('ko-KR')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
