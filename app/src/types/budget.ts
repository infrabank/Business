export type BudgetPeriod = 'monthly' | 'weekly'

export interface Budget {
  id: string
  orgId: string
  projectId?: string
  amount: number
  spent?: number
  alertThresholds: number[]
  period: BudgetPeriod
  isActive: boolean
  createdAt: string
}

export interface BudgetStatus {
  budgetId: string
  name: string
  amount: number
  spent: number
  percentage: number
}
