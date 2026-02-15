'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { Plus, Bell } from 'lucide-react'

const mockBudgets = [
  { id: '1', name: 'Total Monthly Budget', amount: 5000, spent: 2847.53, thresholds: [50, 80, 100], isActive: true },
  { id: '2', name: 'Production Project', amount: 3000, spent: 1842.30, thresholds: [50, 80, 100], isActive: true },
  { id: '3', name: 'Development', amount: 1000, spent: 653.18, thresholds: [80, 100], isActive: true },
]

export default function BudgetPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
          <p className="text-gray-500">Set spending limits and get alerts</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Add Budget</Button>
      </div>

      <div className="space-y-4">
        {mockBudgets.map((b) => {
          const pct = (b.spent / b.amount) * 100
          const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
          return (
            <Card key={b.id}>
              <CardContent className="py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{b.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatCurrency(b.spent)} of {formatCurrency(b.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={pct >= 80 ? 'warning' : 'success'}>{pct.toFixed(0)}%</Badge>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Bell className="h-4 w-4" />
                      {b.thresholds.map((t) => `${t}%`).join(', ')}
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
