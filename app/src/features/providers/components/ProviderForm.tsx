'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import type { ProviderType } from '@/types'

interface ProviderFormProps {
  onSubmit: (data: { type: ProviderType; name: string; apiKey: string }) => void
  onCancel?: () => void
  isLoading?: boolean
}

const PROVIDER_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google AI' },
]

export function ProviderForm({ onSubmit, onCancel, isLoading }: ProviderFormProps) {
  const [type, setType] = useState<ProviderType>('openai')
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ type, name: name || PROVIDER_OPTIONS.find((p) => p.value === type)!.label, apiKey })
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">Add Provider</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Provider</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProviderType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Input label="Display Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Production OpenAI" />
          <Input label="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          <div className="flex gap-2">
            <Button type="submit" disabled={!apiKey || isLoading}>
              {isLoading ? 'Validating...' : 'Add Provider'}
            </Button>
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
