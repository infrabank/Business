'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/constants'
import { useProviders } from '@/features/providers/hooks/useProviders'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { SyncButton } from '@/features/providers/components/SyncButton'
import { SyncHistory } from '@/features/providers/components/SyncHistory'

const PROVIDERS_WITH_USAGE_API = new Set(['openai', 'anthropic'])

export default function ProviderDetailPage() {
  const params = useParams()
  const providerId = params.id as string
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { providers, isLoading } = useProviders(orgId)
  const [showAddKey, setShowAddKey] = useState(false)
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [syncRefreshKey, setSyncRefreshKey] = useState(0)

  const provider = providers.find((p) => p.id === providerId)

  const handleSyncComplete = useCallback(() => {
    setSyncRefreshKey((k) => k + 1)
  }, [])

  if (!isReady || isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
  }

  if (!provider) {
    return (
      <div className="space-y-6">
        <Link href="/providers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> 프로바이더 목록으로
        </Link>
        <p className="text-gray-500">프로바이더를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const providerLabel = PROVIDER_LABELS[provider.type] ?? provider.type
  const color = PROVIDER_COLORS[provider.type] ?? '#6B7280'
  const supportsUsageApi = PROVIDERS_WITH_USAGE_API.has(provider.type)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/providers" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: color }}>
            {providerLabel.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{provider.name}</h1>
            <p className="text-sm text-gray-500">{providerLabel}</p>
          </div>
        </div>
        <Badge variant={provider.isActive ? 'success' : 'default'} className="ml-auto">
          {provider.isActive ? '활성' : '비활성'}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">API 키</h3>
            <Button size="sm" onClick={() => setShowAddKey(!showAddKey)}>
              <Plus className="mr-1 h-4 w-4" /> 키 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddKey && (
            <div className="mb-4 space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <Input label="레이블" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="예: Production" />
              <Input label="API 키" type="password" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder="sk-..." />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowAddKey(false)}>키 저장</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddKey(false)}>취소</Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-gray-500">API 키를 추가하면 여기에 표시됩니다.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">동기화 상태</h3>
        </CardHeader>
        <CardContent>
          {orgId ? (
            <SyncButton
              providerId={providerId}
              orgId={orgId}
              lastSyncAt={provider.lastSyncAt}
              supportsUsageApi={supportsUsageApi}
              onSyncComplete={handleSyncComplete}
            />
          ) : (
            <p className="text-sm text-gray-500">조직 정보 로딩 중...</p>
          )}
        </CardContent>
      </Card>

      {orgId && supportsUsageApi && (
        <SyncHistory
          orgId={orgId}
          providerId={providerId}
          refreshKey={syncRefreshKey}
        />
      )}
    </div>
  )
}
