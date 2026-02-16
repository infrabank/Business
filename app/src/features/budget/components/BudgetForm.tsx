'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

interface BudgetFormProps {
  onSubmit: (data: { amount: number; name: string }) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function BudgetForm({ onSubmit, onCancel, isLoading }: BudgetFormProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return
    onSubmit({ name: name || 'Monthly Budget', amount: parsed })
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">Add Budget</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Budget Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Monthly API Budget" />
          <Input label="Amount ($)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 500" min="1" step="0.01" />
          <p className="text-xs text-gray-500">Alerts will be sent at 50%, 80%, and 100% thresholds.</p>
          <div className="flex gap-2">
            <Button type="submit" disabled={!amount || isLoading}>
              {isLoading ? 'Creating...' : 'Add Budget'}
            </Button>
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
