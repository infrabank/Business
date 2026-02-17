'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { useNotificationChannels } from '../hooks/useNotificationChannels'
import { isFeatureAvailable } from '@/lib/plan-limits'
import { Mail, MessageSquare, Webhook, Plus, Trash2, Send, X } from 'lucide-react'
import type { UserPlan } from '@/types'
import type { ChannelType, EmailConfig, SlackConfig, WebhookConfig } from '@/types/notification'
import Link from 'next/link'

interface ChannelManagerProps {
  orgId: string | null
  plan: UserPlan
}

const CHANNEL_ICONS: Record<ChannelType, typeof Mail> = {
  email: Mail,
  slack: MessageSquare,
  webhook: Webhook,
}

const CHANNEL_LABELS: Record<ChannelType, string> = {
  email: '이메일',
  slack: 'Slack',
  webhook: 'Webhook',
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  budget_warning: '예산 경고',
  budget_exceeded: '예산 초과',
  anomaly: '이상 감지',
  optimization: '최적화',
}

export function ChannelManager({ orgId, plan }: ChannelManagerProps) {
  const { channels, isLoading, createChannel, updateChannel, removeChannel, testChannel } = useNotificationChannels(orgId)
  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState<ChannelType>('email')
  const [addName, setAddName] = useState('')
  const [addConfig, setAddConfig] = useState('')
  const [addAlertTypes, setAddAlertTypes] = useState<string[]>(['budget_warning', 'budget_exceeded', 'anomaly', 'optimization'])
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)

  const canAddMore = isFeatureAvailable(plan, 'notifications') || channels.length < 1

  const handleAdd = async () => {
    if (!addName || !addConfig) return
    setSaving(true)
    try {
      let config: EmailConfig | SlackConfig | WebhookConfig
      if (addType === 'email') {
        config = { recipients: addConfig.split(',').map((e) => e.trim()).filter(Boolean) }
      } else if (addType === 'slack') {
        config = { webhookUrl: addConfig, channel: addName }
      } else {
        config = { url: addConfig }
      }

      await createChannel({ type: addType, name: addName, config, alertTypes: addAlertTypes })
      toast('success', '채널이 추가되었습니다.')
      setShowAdd(false)
      setAddName('')
      setAddConfig('')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : '채널 추가 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const result = await testChannel(id)
      if (result.success) {
        toast('success', '테스트 메시지가 전송되었습니다.')
      } else {
        toast('error', `전송 실패: ${result.error}`)
      }
    } catch {
      toast('error', '테스트 전송 실패')
    } finally {
      setTestingId(null)
    }
  }

  const handleToggle = async (id: string, type: ChannelType, enabled: boolean) => {
    await updateChannel(id, type, { enabled: !enabled })
  }

  const handleDelete = async (id: string) => {
    await removeChannel(id)
    toast('success', '채널이 삭제되었습니다.')
  }

  if (isLoading) {
    return <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">알림 채널</h3>
        {canAddMore && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-4 w-4" /> 추가
          </Button>
        )}
      </div>

      {/* Add Channel Form */}
      {showAdd && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">새 채널 추가</span>
            <button onClick={() => setShowAdd(false)} className="text-blue-400 hover:text-blue-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2">
            {(['email', 'slack', 'webhook'] as ChannelType[]).map((t) => {
              const disabled = !isFeatureAvailable(plan, 'notifications') && t !== 'email'
              return (
                <button
                  key={t}
                  onClick={() => !disabled && setAddType(t)}
                  disabled={disabled}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    addType === t ? 'bg-blue-600 text-white' : disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {CHANNEL_LABELS[t]}
                </button>
              )
            })}
          </div>

          <Input
            id="channel-name"
            label="채널 이름"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder={addType === 'email' ? '팀 이메일' : addType === 'slack' ? '#cost-alerts' : 'PagerDuty'}
          />

          <Input
            id="channel-config"
            label={addType === 'email' ? '수신 이메일 (쉼표 구분)' : addType === 'slack' ? 'Webhook URL' : 'Webhook URL'}
            value={addConfig}
            onChange={(e) => setAddConfig(e.target.value)}
            placeholder={
              addType === 'email' ? 'admin@company.com, dev@company.com'
                : addType === 'slack' ? 'https://hooks.slack.com/services/...'
                : 'https://events.pagerduty.com/...'
            }
          />

          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-600">수신 알림 유형</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() =>
                    setAddAlertTypes((prev) =>
                      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    addAlertTypes.includes(key) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button size="sm" onClick={handleAdd} disabled={saving || !addName || !addConfig}>
            {saving ? '추가 중...' : '채널 추가'}
          </Button>
        </div>
      )}

      {/* Channel List */}
      {channels.length === 0 && !showAdd && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
          등록된 알림 채널이 없습니다.
        </div>
      )}

      {channels.map((ch) => {
        const Icon = CHANNEL_ICONS[ch.type]
        const configSummary = ch.type === 'email'
          ? (ch.config as EmailConfig).recipients.join(', ')
          : ch.type === 'slack'
          ? (ch.config as SlackConfig).channel || 'Slack'
          : (ch.config as WebhookConfig).url

        return (
          <div
            key={ch.id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${ch.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
          >
            <Icon className="mt-0.5 h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">{ch.name}</span>
                <Badge variant={ch.enabled ? 'success' : 'default'}>{ch.enabled ? '활성' : '비활성'}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 truncate">{configSummary}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {ch.alertTypes.map((t) => (
                  <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{ALERT_TYPE_LABELS[t] || t}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleToggle(ch.id, ch.type, ch.enabled)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title={ch.enabled ? '비활성화' : '활성화'}
              >
                <div className={`h-4 w-7 rounded-full transition ${ch.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <div className={`h-3 w-3 rounded-full bg-white transition-transform mt-0.5 ${ch.enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </div>
              </button>
              <button
                onClick={() => handleTest(ch.id)}
                disabled={testingId === ch.id}
                className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                title="테스트"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(ch.id)}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })}

      {/* Free plan gate */}
      {!isFeatureAvailable(plan, 'notifications') && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          Free 플랜: 이메일 1채널만 사용 가능합니다.{' '}
          <Link href="/pricing" className="font-medium text-amber-900 underline">Growth로 업그레이드</Link>
          하면 무제한 채널을 사용할 수 있습니다.
        </div>
      )}
    </div>
  )
}
