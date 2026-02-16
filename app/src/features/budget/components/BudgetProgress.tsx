'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { Bell } from 'lucide-react'

interface BudgetProgressProps {
  name: string
  amount: number
  spent: number
  thresholds?: number[]
}

export function BudgetProgress({ name, amount, spent, thresholds = [50, 80, 100] }: BudgetProgressProps) {
  const pct = (spent / amount) * 100
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500'

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{name}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {formatCurrency(spent)} / {formatCurrency(amount)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pct >= 80 ? 'warning' : 'success'}>{pct.toFixed(0)}%</Badge>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Bell className="h-4 w-4" />
              {thresholds.map((t) => `${t}%`).join(', ')}
            </div>
          </div>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </CardContent>
    </Card>
  )
}
