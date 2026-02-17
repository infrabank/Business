'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, XCircle } from 'lucide-react'
import type { Alert } from '@/types'

interface AnomalyDetailPanelProps {
  alert: Alert
  onSuppress?: (pattern: string) => void
  onClose: () => void
}

export function AnomalyDetailPanel({ alert, onSuppress, onClose }: AnomalyDetailPanelProps) {
  const meta = alert.metadata as Record<string, unknown> | undefined
  if (!meta) return null

  const detectedValue = Number(meta.detectedValue ?? 0)
  const baselineValue = Number(meta.baselineValue ?? 0)
  const severity = (meta.severity as string) ?? 'warning'
  const model = meta.model as string | undefined
  const anomalyType = meta.anomalyType as string | undefined

  const ratio = baselineValue > 0
    ? ((detectedValue / baselineValue) * 100).toFixed(0)
    : '∞'

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardContent className="space-y-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-slate-900">이상 감지 상세</span>
            <Badge variant={severity === 'critical' ? 'danger' : 'warning'}>
              {severity}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {/* Bar comparison */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">기준값</span>
            <span className="font-medium text-slate-900">${baselineValue.toFixed(2)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-slate-400" style={{ width: '100%' }} />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-600">감지값</span>
            <span className="font-bold text-rose-600">${detectedValue.toFixed(2)} ({ratio}%)</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-rose-500"
              style={{ width: `${Math.min(Number(ratio), 300) / 3}%` }}
            />
          </div>
        </div>

        {model && (
          <p className="text-sm text-slate-600">모델: <span className="font-medium">{model}</span></p>
        )}

        {onSuppress && anomalyType && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSuppress(`${anomalyType}:${model ?? 'all'}`)}
          >
            <XCircle className="mr-1 h-4 w-4" /> 이 패턴 무시
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
