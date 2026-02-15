import { bkend } from '@/lib/bkend'
import type { OptimizationTip, UsageRecord } from '@/types'

const MODEL_ALTERNATIVES: Record<string, { alternative: string; savingsRatio: number }> = {
  'gpt-4o': { alternative: 'gpt-4o-mini', savingsRatio: 0.85 },
  'gpt-4-turbo': { alternative: 'gpt-4o-mini', savingsRatio: 0.9 },
  'claude-opus-4': { alternative: 'claude-sonnet-4-5', savingsRatio: 0.8 },
  'claude-sonnet-4-5': { alternative: 'claude-haiku-4-5', savingsRatio: 0.7 },
  'gemini-1.5-pro': { alternative: 'gemini-2.0-flash', savingsRatio: 0.75 },
}

export async function generateOptimizationTips(orgId: string, token: string): Promise<OptimizationTip[]> {
  const tips: Omit<OptimizationTip, 'id' | 'createdAt'>[] = []

  // Get last 30 days of usage
  const from = new Date()
  from.setDate(from.getDate() - 30)
  const records = await bkend.get<UsageRecord[]>('/usage-records', {
    token,
    params: { orgId, date_gte: from.toISOString().split('T')[0] },
  })

  // Analyze model usage for downgrade opportunities
  const modelCosts = new Map<string, number>()
  for (const r of records) {
    modelCosts.set(r.model, (modelCosts.get(r.model) || 0) + r.cost)
  }

  for (const [model, cost] of modelCosts) {
    const alt = MODEL_ALTERNATIVES[model]
    if (alt && cost > 50) {
      const saving = cost * alt.savingsRatio
      tips.push({
        orgId,
        category: 'model_downgrade',
        suggestion: `Switch ${model} to ${alt.alternative} for simple tasks. Potential saving: $${saving.toFixed(0)}/month.`,
        potentialSaving: saving,
        status: 'pending',
      })
    }
  }

  // Check for unused API keys
  const providers = await bkend.get<{ id: string }[]>('/providers', { token, params: { orgId } })
  for (const provider of providers) {
    const keys = await bkend.get<{ id: string; isActive: boolean; label: string }[]>('/api-keys', {
      token,
      params: { providerId: provider.id },
    })
    const unusedKeys = keys.filter((k) => {
      const keyRecords = records.filter((r) => r.apiKeyId === k.id)
      return k.isActive && keyRecords.length === 0
    })

    if (unusedKeys.length > 0) {
      tips.push({
        orgId,
        category: 'unused_key',
        suggestion: `${unusedKeys.length} unused API key(s) found. Consider deactivating: ${unusedKeys.map((k) => k.label).join(', ')}.`,
        potentialSaving: 0,
        status: 'pending',
      })
    }
  }

  // Save tips to DB
  const savedTips: OptimizationTip[] = []
  for (const tip of tips) {
    const saved = await bkend.post<OptimizationTip>('/optimization-tips', tip, { token })
    savedTips.push(saved)
  }

  return savedTips
}
