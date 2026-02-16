'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/constants'
import { Plus, Key, MoreVertical, Pencil, Trash2, Power, X, Check } from 'lucide-react'
import { useProviders } from '@/features/providers/hooks/useProviders'
import { ProviderForm } from '@/features/providers/components/ProviderForm'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { toast } from '@/components/ui/Toast'
import type { Provider, ProviderType } from '@/types'

function ProviderMenu({ provider, onEdit, onToggle, onDelete }: {
  provider: Provider
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => { onEdit(); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" /> Edit Name
          </button>
          <button
            onClick={() => { onToggle(); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Power className="h-4 w-4" /> {provider.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <hr className="my-1 border-gray-100" />
          <button
            onClick={() => { onDelete(); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProvidersPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { providers, isLoading, addProvider, updateProvider, deleteProvider } = useProviders(orgId)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleSubmit = async (data: { type: ProviderType; name: string; apiKey: string }) => {
    setIsSubmitting(true)
    setFormError(null)
    const result = await addProvider(data)
    setIsSubmitting(false)
    if (result.success) {
      setShowForm(false)
      setFormError(null)
      toast('success', 'Provider added successfully.')
    } else {
      setFormError(result.error || 'Failed to add provider.')
    }
  }

  const handleEdit = (provider: Provider) => {
    setEditingId(provider.id)
    setEditName(provider.name)
  }

  const handleSaveEdit = async (providerId: string) => {
    if (!editName.trim()) return
    const result = await updateProvider(providerId, { name: editName.trim() })
    if (result.success) toast('success', 'Provider updated.')
    else toast('error', result.error || 'Failed to update.')
    setEditingId(null)
  }

  const handleToggleActive = async (provider: Provider) => {
    const result = await updateProvider(provider.id, { isActive: !provider.isActive })
    if (result.success) toast('info', provider.isActive ? 'Provider deactivated.' : 'Provider activated.')
    else toast('error', result.error || 'Failed to update.')
  }

  const handleDelete = async (providerId: string) => {
    const result = await deleteProvider(providerId)
    if (result.success) toast('success', 'Provider deleted.')
    else toast('error', result.error || 'Failed to delete.')
    setDeleteConfirmId(null)
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
          onCancel={() => { setShowForm(false); setFormError(null) }}
          isLoading={isSubmitting}
          error={formError}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <Card key={p.id} className={`relative ${!p.isActive ? 'opacity-60' : ''}`}>
            <CardContent className="py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${PROVIDER_COLORS[p.type] ?? '#6B7280'}15` }}>
                    <div className="h-5 w-5 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[p.type] ?? '#6B7280' }} />
                  </div>
                  <div>
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(p.id); if (e.key === 'Escape') setEditingId(null) }}
                          autoFocus
                          className="w-40 rounded border border-blue-400 px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button onClick={() => handleSaveEdit(p.id)} className="rounded p-1 text-green-600 hover:bg-green-50">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    )}
                    <p className="text-sm text-gray-500">{PROVIDER_LABELS[p.type] ?? p.type}</p>
                  </div>
                </div>
                <ProviderMenu
                  provider={p}
                  onEdit={() => handleEdit(p)}
                  onToggle={() => handleToggleActive(p)}
                  onDelete={() => setDeleteConfirmId(p.id)}
                />
              </div>

              {deleteConfirmId === p.id && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">Delete &quot;{p.name}&quot;?</p>
                  <p className="mt-1 text-xs text-red-600">This will remove the provider and all associated API keys. This cannot be undone.</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              {deleteConfirmId !== p.id && (
                <>
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
                </>
              )}
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
