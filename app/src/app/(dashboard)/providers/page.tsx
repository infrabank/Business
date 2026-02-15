'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/constants'
import { Plus, Key, MoreVertical } from 'lucide-react'
import type { ProviderType } from '@/types'

const mockProviders = [
  { id: '1', type: 'openai' as ProviderType, name: 'Main OpenAI', isActive: true, keyCount: 3, lastSync: '2 hours ago' },
  { id: '2', type: 'anthropic' as ProviderType, name: 'Anthropic Production', isActive: true, keyCount: 2, lastSync: '3 hours ago' },
  { id: '3', type: 'google' as ProviderType, name: 'Google AI Dev', isActive: true, keyCount: 1, lastSync: '5 hours ago' },
]

export default function ProvidersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-gray-500">Manage your LLM API providers and keys</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Add Provider</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockProviders.map((p) => (
          <Card key={p.id} className="relative">
            <CardContent className="py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${PROVIDER_COLORS[p.type]}15` }}>
                    <div className="h-5 w-5 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[p.type] }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-sm text-gray-500">{PROVIDER_LABELS[p.type]}</p>
                  </div>
                </div>
                <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Key className="h-4 w-4" />
                  {p.keyCount} keys
                </div>
                <Badge variant={p.isActive ? 'success' : 'default'}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <p className="mt-3 text-xs text-gray-400">Last synced: {p.lastSync}</p>
            </CardContent>
          </Card>
        ))}

        {/* Add Provider Card */}
        <Card className="border-dashed">
          <CardContent className="flex h-full min-h-[160px] flex-col items-center justify-center py-5">
            <Plus className="h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-500">Add a new provider</p>
            <p className="text-xs text-gray-400">OpenAI, Anthropic, Google, or custom</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
