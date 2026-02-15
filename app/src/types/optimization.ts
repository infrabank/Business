export type OptimizationCategory = 'model_downgrade' | 'batch_processing' | 'caching' | 'unused_key'
export type OptimizationStatus = 'pending' | 'applied' | 'dismissed'

export interface OptimizationTip {
  id: string
  orgId: string
  category: OptimizationCategory
  suggestion: string
  potentialSaving: number
  status: OptimizationStatus
  createdAt: string
}
