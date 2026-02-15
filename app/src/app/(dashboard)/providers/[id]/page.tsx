'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Plus, Key, Trash2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/constants'
import type { ProviderType } from '@/types'

const mockProvider = {
  id: '1',
  type: 'openai' as ProviderType,
  name: 'Production OpenAI',
  isActive: true,
  lastSyncAt: '2026-02-15T08:30:00Z',
}

const mockKeys = [
  { id: '1', label: 'Production Key', keyPrefix: 'sk-proj-abc...wxyz', isActive: true, createdAt: '2026-01-10' },
  { id: '2', label: 'Dev Key', keyPrefix: 'sk-proj-def...uvst', isActive: true, createdAt: '2026-01-15' },
]

export default function ProviderDetailPage() {
  const [showAddKey, setShowAddKey] = useState(false)
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')

  const provider = mockProvider
  const providerLabel = PROVIDER_LABELS[provider.type] ?? provider.type
  const color = PROVIDER_COLORS[provider.type] ?? '#6B7280'

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
          {provider.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
            <Button size="sm" onClick={() => setShowAddKey(!showAddKey)}>
              <Plus className="mr-1 h-4 w-4" /> Add Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddKey && (
            <div className="mb-4 space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <Input label="Label" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="e.g., Production" />
              <Input label="API Key" type="password" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder="sk-..." />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowAddKey(false)}>Save Key</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddKey(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {mockKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{key.label}</p>
                    <p className="text-xs text-gray-500 font-mono">{key.keyPrefix}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={key.isActive ? 'success' : 'default'} className="text-xs">
                    {key.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-gray-400">{key.createdAt}</span>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last synced</p>
              <p className="font-medium text-gray-900">
                {provider.lastSyncAt ? new Date(provider.lastSyncAt).toLocaleString() : 'Never'}
              </p>
            </div>
            <Button variant="outline">Sync Now</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
