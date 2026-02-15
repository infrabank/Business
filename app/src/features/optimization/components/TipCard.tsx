'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { Lightbulb, X, Check } from 'lucide-react'
import type { OptimizationCategory, OptimizationStatus } from '@/types'

interface TipCardProps {
  suggestion: string
  category: OptimizationCategory
  potentialSaving: number
  status: OptimizationStatus
  onApply?: () => void
  onDismiss?: () => void
}

const categoryLabels: Record<OptimizationCategory, string> = {
  model_downgrade: 'Model Switch',
  batch_processing: 'Batch Processing',
  caching: 'Caching',
  unused_key: 'Unused Key',
}

export function TipCard({ suggestion, category, potentialSaving, status, onApply, onDismiss }: TipCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="info">{categoryLabels[category]}</Badge>
            {potentialSaving > 0 && (
              <span className="text-sm font-medium text-green-600">Save {formatCurrency(potentialSaving)}/mo</span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-700">{suggestion}</p>
        </div>
        {status === 'pending' && (
          <div className="flex shrink-0 gap-1">
            {onApply && (
              <Button variant="ghost" size="sm" onClick={onApply}>
                <Check className="h-4 w-4" />
              </Button>
            )}
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
