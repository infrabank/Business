'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { Plus, Bell } from 'lucide-react'
import { useBudgets } from '@/features/budget/hooks/useBudgets'
import { BudgetForm } from '@/features/budget/components/BudgetForm'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'

export default function BudgetPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { budgets, isLoading, createBudget } = useBudgets(orgId)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: { amount: number; name: string }) => {
    setIsSubmitting(true)
    const success = await createBudget(data)
    setIsSubmitting(false)
    if (success) setShowForm(false)
  }

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
          <p className="text-gray-500">Set spending limits and get alerts</p>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
          <p className="text-gray-500">Set spending limits and get alerts</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Add Budget</Button>
      </div>

      {showForm && (
        <BudgetForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          isLoading={isSubmitting}
        />
      )}

      {budgets.length === 0 && !showForm ? (
        <Card className="cursor-pointer border-dashed transition-colors hover:border-blue-400 hover:bg-blue-50/50" onClick={() => setShowForm(true)}>
          <CardContent className="flex min-h-[120px] flex-col items-center justify-center py-8">
            <Plus className="h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No budgets yet. Click to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {budgets.map((b) => {
            const pct = b.amount > 0 ? 0 : 0
            const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
            return (
              <Card key={b.id}>
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{b.period} budget</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatCurrency(b.amount)} limit
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.isActive ? 'success' : 'default'}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Bell className="h-4 w-4" />
                        {b.alertThresholds.map((t) => `${t}%`).join(', ')}
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
      )}
    </div>
  )
}
