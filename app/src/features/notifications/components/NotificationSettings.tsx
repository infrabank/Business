'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { useNotificationSettings } from '../hooks/useNotificationSettings'
import { isFeatureAvailable } from '@/lib/plan-limits'
import { Clock, CheckCircle, XCircle, RotateCw } from 'lucide-react'
import type { UserPlan } from '@/types'
import type { DeliveryMode } from '@/types/notification'
import Link from 'next/link'

interface NotificationSettingsProps {
  orgId: string | null
  plan: UserPlan
}

const DELIVERY_MODE_OPTIONS: { value: DeliveryMode; label: string; desc: string }[] = [
  { value: 'instant', label: '즉시 전송', desc: '알림 발생 시 즉시 외부 채널로 전송' },
  { value: 'digest', label: '다이제스트만', desc: '매일 요약 이메일만 발송' },
  { value: 'both', label: '즉시 + 다이제스트', desc: '즉시 전송 + 매일 요약' },
]

const TIMEZONE_OPTIONS = [
  'Asia/Seoul',
  'Asia/Tokyo',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'UTC',
]

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  sent: CheckCircle,
  failed: XCircle,
  retrying: RotateCw,
}

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning'> = {
  sent: 'success',
  failed: 'danger',
  retrying: 'warning',
}

const STATUS_LABEL: Record<string, string> = {
  sent: '성공',
  failed: '실패',
  retrying: '재시도',
  pending: '대기',
}

const CHANNEL_ICON: Record<string, string> = {
  email: '📧',
  slack: '💬',
  webhook: '🔗',
}

export function NotificationSettings({ orgId, plan }: NotificationSettingsProps) {
  const { preferences, logs, isLoading, updatePreferences } = useNotificationSettings(orgId)
  const [saving, setSaving] = useState(false)

  const [enabled, setEnabled] = useState(true)
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('instant')
  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestTime, setDigestTime] = useState('09:00')
  const [timezone, setTimezone] = useState('Asia/Seoul')

  useEffect(() => {
    if (preferences) {
      setEnabled(preferences.enabled)
      setDeliveryMode(preferences.deliveryMode)
      setDigestEnabled(preferences.digestEnabled)
      setDigestTime(preferences.digestTime)
      setTimezone(preferences.timezone)
    }
  }, [preferences])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePreferences({ enabled, deliveryMode, digestEnabled, digestTime, timezone })
      toast('success', '알림 설정이 저장되었습니다.')
    } catch {
      toast('error', '설정 저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return <div className="mt-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />)}</div>
  }

  const recentLogs = logs.slice(0, 10)

  return (
    <div className="mt-6 space-y-6">
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">알림 설정</h3>

        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-900 dark:text-slate-100">알림 수신</span>
            <p className="text-xs text-gray-500 dark:text-slate-400">외부 채널로의 알림 전송을 켜거나 끕니다</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`h-6 w-11 rounded-full transition ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <div className={`h-5 w-5 rounded-full bg-white dark:bg-slate-900 shadow transition-transform ${enabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} style={{ transform: enabled ? 'translateX(22px)' : 'translateX(2px)' }} />
          </button>
        </div>

        {/* Delivery mode */}
        <div className="space-y-2">
          <span className="text-sm text-gray-900 dark:text-slate-100">전송 모드</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {DELIVERY_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDeliveryMode(opt.value)}
                className={`rounded-lg border p-3 text-left transition ${
                  deliveryMode === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600'
                }`}
              >
                <span className={`text-sm font-medium ${deliveryMode === opt.value ? 'text-blue-700' : 'text-gray-900 dark:text-slate-100'}`}>
                  {opt.label}
                </span>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Digest settings */}
        <div className={`space-y-3 rounded-lg border p-3 ${!isFeatureAvailable(plan, 'notifications') ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900 dark:text-slate-100">일별 다이제스트</span>
              {!isFeatureAvailable(plan, 'notifications') && (
                <Badge variant="warning">Growth</Badge>
              )}
            </div>
            <button
              onClick={() => isFeatureAvailable(plan, 'notifications') && setDigestEnabled(!digestEnabled)}
              disabled={!isFeatureAvailable(plan, 'notifications')}
              className={`h-6 w-11 rounded-full transition ${digestEnabled ? 'bg-emerald-500' : 'bg-gray-300'} disabled:cursor-not-allowed`}
            >
              <div className="h-5 w-5 rounded-full bg-white dark:bg-slate-900 shadow transition-transform" style={{ transform: digestEnabled ? 'translateX(22px)' : 'translateX(2px)' }} />
            </button>
          </div>

          {digestEnabled && isFeatureAvailable(plan, 'notifications') && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-slate-400">발송 시간</label>
                <input
                  type="time"
                  value={digestTime}
                  onChange={(e) => setDigestTime(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-slate-400">타임존</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!isFeatureAvailable(plan, 'notifications') && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              <Link href="/pricing" className="underline">Growth 플랜</Link>에서 사용 가능합니다.
            </p>
          )}
        </div>

        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>

      {/* Recent Logs */}
      {recentLogs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">최근 전송 이력</h3>
          <div className="divide-y rounded-lg border">
            {recentLogs.map((log) => {
              const StatusIcon = STATUS_ICON[log.status] || Clock
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-base">{CHANNEL_ICON[log.channelType] || '📨'}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900 dark:text-slate-100 truncate block">{log.alertId === 'digest' ? '일별 다이제스트' : `Alert #${log.alertId.slice(0, 8)}`}</span>
                  </div>
                  <Badge variant={STATUS_VARIANT[log.status] || 'default'}>
                    {STATUS_LABEL[log.status] || log.status}
                  </Badge>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {timeAgo(log.createdAt)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}
