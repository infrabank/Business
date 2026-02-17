'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { Plus, Bell, MoreVertical, Pencil, Trash2, Power, Check, X } from 'lucide-react'
import { useBudgets } from '@/features/budget/hooks/useBudgets'
import { BudgetForm } from '@/features/budget/components/BudgetForm'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { toast } from '@/components/ui/Toast'
import type { Budget } from '@/types'

function BudgetMenu({ budget, onEdit, onToggle, onDelete }: {
  budget: Budget
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
      <button onClick={() => setOpen(!open)} className="rounded p-1 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
          <button onClick={() => { onEdit(); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
            <Pencil className="h-4 w-4" /> 금액 수정
          </button>
          <button onClick={() => { onToggle(); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
            <Power className="h-4 w-4" /> {budget.isActive ? '비활성화' : '활성화'}
          </button>
          <hr className="my-1 border-gray-100 dark:border-slate-800" />
          <button onClick={() => { onDelete(); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> 삭제
          </button>
        </div>
      )}
    </div>
  )
}

export default function BudgetPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { budgets, isLoading, createBudget, updateBudget, deleteBudget } = useBudgets(orgId)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleSubmit = async (data: { amount: number; name: string }) => {
    setIsSubmitting(true)
    const success = await createBudget(data)
    setIsSubmitting(false)
    if (success) { setShowForm(false); toast('success', '예산이 생성되었습니다.') }
    else toast('error', '예산 생성에 실패했습니다.')
  }

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id)
    setEditAmount(String(budget.amount))
  }

  const handleSaveEdit = async (budgetId: string) => {
    const parsed = parseFloat(editAmount)
    if (isNaN(parsed) || parsed <= 0) return
    const success = await updateBudget(budgetId, { amount: parsed })
    if (success) toast('success', '예산이 업데이트되었습니다.')
    else toast('error', '예산 업데이트에 실패했습니다.')
    setEditingId(null)
  }

  const handleToggleActive = async (budget: Budget) => {
    const success = await updateBudget(budget.id, { isActive: !budget.isActive })
    if (success) toast('info', budget.isActive ? '예산이 비활성화되었습니다.' : '예산이 활성화되었습니다.')
    else toast('error', '예산 업데이트에 실패했습니다.')
  }

  const handleDelete = async (budgetId: string) => {
    const success = await deleteBudget(budgetId)
    if (success) toast('success', '예산이 삭제되었습니다.')
    else toast('error', '예산 삭제에 실패했습니다.')
    setDeleteConfirmId(null)
  }

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">예산</h1>
          <p className="text-gray-500 dark:text-slate-400">지출 한도를 설정하고 알림을 받으세요</p>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">예산</h1>
          <p className="text-gray-500 dark:text-slate-400">지출 한도를 설정하고 알림을 받으세요</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> 예산 추가</Button>
      </div>

      {showForm && (
        <BudgetForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          isLoading={isSubmitting}
        />
      )}

      {budgets.length === 0 && !showForm ? (
        <Card className="cursor-pointer border-dashed transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20" onClick={() => setShowForm(true)}>
          <CardContent className="flex min-h-[120px] flex-col items-center justify-center py-8">
            <Plus className="h-8 w-8 text-gray-400 dark:text-slate-500" />
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">설정된 예산이 없습니다. 클릭하여 생성하세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {budgets.map((b) => {
            const pct = b.amount > 0 ? Math.round((b.spent ?? 0) / b.amount * 100) : 0
            const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
            return (
              <Card key={b.id} className={!b.isActive ? 'opacity-60' : ''}>
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">{b.period === 'monthly' ? '월간' : b.period === 'weekly' ? '주간' : '일간'} 예산</h3>
                      {editingId === b.id ? (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-sm text-gray-500">$</span>
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(b.id); if (e.key === 'Escape') setEditingId(null) }}
                            autoFocus
                            min="1"
                            step="0.01"
                            className="w-28 rounded border border-blue-400 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button onClick={() => handleSaveEdit(b.id)} className="rounded p-1 text-green-600 hover:bg-green-50">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">한도 {formatCurrency(b.amount)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.isActive ? 'success' : 'default'}>
                        {b.isActive ? '활성' : '비활성'}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-400 dark:text-slate-500">
                        <Bell className="h-4 w-4" />
                        {b.alertThresholds.map((t) => `${t}%`).join(', ')}
                      </div>
                      <BudgetMenu
                        budget={b}
                        onEdit={() => handleEdit(b)}
                        onToggle={() => handleToggleActive(b)}
                        onDelete={() => setDeleteConfirmId(b.id)}
                      />
                    </div>
                  </div>

                  {deleteConfirmId === b.id && (
                    <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/50 p-3">
                      <p className="text-sm font-medium text-red-800 dark:text-red-400">이 예산을 삭제하시겠습니까?</p>
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">예산과 알림 임계값이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDelete(b.id)}>
                          <Trash2 className="mr-1 h-3 w-3" /> 삭제
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(null)}>취소</Button>
                      </div>
                    </div>
                  )}

                  {deleteConfirmId !== b.id && (
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
