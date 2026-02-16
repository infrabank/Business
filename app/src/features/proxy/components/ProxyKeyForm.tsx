'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import type { ProviderType } from '@/types/provider'

interface ProxyKeyFormProps {
  onSubmit: (data: {
    name: string
    providerType: ProviderType
    apiKey: string
    budgetLimit?: number
    rateLimit?: number
  }) => Promise<{ proxyKey: string } | null>
}

export function ProxyKeyForm({ onSubmit }: ProxyKeyFormProps) {
  const [name, setName] = useState('')
  const [providerType, setProviderType] = useState<ProviderType>('openai')
  const [apiKey, setApiKey] = useState('')
  const [budgetLimit, setBudgetLimit] = useState('')
  const [rateLimit, setRateLimit] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await onSubmit({
        name,
        providerType,
        apiKey,
        budgetLimit: budgetLimit ? Number(budgetLimit) : undefined,
        rateLimit: rateLimit ? Number(rateLimit) : undefined,
      })
      if (result) {
        setCreatedKey(result.proxyKey)
        setName('')
        setApiKey('')
        setBudgetLimit('')
        setRateLimit('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (createdKey) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-green-700">Proxy Key Created</h3>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-600">
            Copy this key now. It will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm font-mono break-all">
              {createdKey}
            </code>
            <Button size="sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setCreatedKey(null)}
          >
            Create Another Key
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Create Proxy Key</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Key Name"
            placeholder="e.g., Production API, Development"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Provider</label>
            <select
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as ProviderType)}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google AI</option>
            </select>
          </div>
          <Input
            label="API Key"
            type="password"
            placeholder="Enter your real API key (will be encrypted)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monthly Budget Limit ($)"
              type="number"
              placeholder="Optional"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              min="0"
              step="0.01"
            />
            <Input
              label="Rate Limit (req/min)"
              type="number"
              placeholder="Optional"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
              min="0"
            />
          </div>
          <Button type="submit" loading={loading} disabled={!name || !apiKey}>
            Create Proxy Key
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
