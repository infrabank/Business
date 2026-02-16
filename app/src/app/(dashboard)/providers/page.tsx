'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/constants'
import { Plus, Key, MoreVertical } from 'lucide-react'
import { useProviders } from '@/features/providers/hooks/useProviders'
import { ProviderForm } from '@/features/providers/components/ProviderForm'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'

export default function ProvidersPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { providers, isLoading, addProvider } = useProviders(orgId)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: { type: import('@/types').ProviderType; name: string; apiKey: string }) => {
    setIsSubmitting(true)
    const success = await addProvider(data)
    setIsSubmitting(false)
    if (success) setShowForm(false)
  }

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-gray-500">Manage your LLM API providers and keys</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-gray-500">Manage your LLM API providers and keys</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Add Provider</Button>
      </div>

      {showForm && (
        <ProviderForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          isLoading={isSubmitting}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <Card key={p.id} className="relative">
            <CardContent className="py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${PROVIDER_COLORS[p.type] ?? '#6B7280'}15` }}>
                    <div className="h-5 w-5 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[p.type] ?? '#6B7280' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-sm text-gray-500">{PROVIDER_LABELS[p.type] ?? p.type}</p>
                  </div>
                </div>
                <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Key className="h-4 w-4" />
                  keys
                </div>
                <Badge variant={p.isActive ? 'success' : 'default'}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <p className="mt-3 text-xs text-gray-400">
                Last synced: {p.lastSyncAt ? new Date(p.lastSyncAt).toLocaleString() : 'Never'}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Add Provider Card */}
        <Card className="cursor-pointer border-dashed transition-colors hover:border-blue-400 hover:bg-blue-50/50" onClick={() => setShowForm(true)}>
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
