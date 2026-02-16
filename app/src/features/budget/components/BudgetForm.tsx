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
        <h3 className="text-lg font-semibold text-gray-900">예산 추가</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="예산 이름" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 월간 API 예산" />
          <Input label="금액 ($)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="예: 500" min="1" step="0.01" />
          <p className="text-xs text-gray-500">50%, 80%, 100% 임계값에서 알림이 전송됩니다.</p>
          <div className="flex gap-2">
            <Button type="submit" disabled={!amount || isLoading}>
              {isLoading ? '생성 중...' : '예산 추가'}
            </Button>
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>취소</Button>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
