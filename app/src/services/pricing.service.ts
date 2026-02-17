import { bkend } from '@/lib/bkend'
import type { ModelPricing, ProviderType } from '@/types'

// ---------------------------------------------------------------------------
// Single source of truth for model pricing (used by proxy-forward, model-router)
// ---------------------------------------------------------------------------

export const FALLBACK_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  'o3-mini': { input: 1.1, output: 4.4 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-pro': { input: 1.25, output: 5 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
}

// In-memory cache from DB, refreshed hourly
let priceCache: Record<string, { input: number; output: number }> | null = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Sync pricing lookup — uses cache → fallback (no DB call)
 * Safe for hot path (proxy forwarding)
 */
export function getModelPricingSync(model: string): { input: number; output: number } {
  if (priceCache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) {
    const cached = priceCache[model]
    if (cached) return cached
  }
  return FALLBACK_PRICING[model] ?? { input: 1, output: 2 }
}

/**
 * Compute cost from model name and token counts.
 * Single source — replaces duplicated computeCost in proxy-forward and model-router.
 */
export function computeCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = getModelPricingSync(model)
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

/**
 * Get all pricing as a record (for model-router alternatives map)
 */
export function getAllPricing(): Record<string, { input: number; output: number }> {
  if (priceCache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) {
    return { ...FALLBACK_PRICING, ...priceCache }
  }
  return { ...FALLBACK_PRICING }
}

/**
 * Refresh in-memory price cache from DB. Call periodically or at startup.
 */
export async function refreshPriceCache(): Promise<void> {
  try {
    const pricings = await bkend.get<ModelPricing[]>('/model-pricings', {
      params: { _limit: '200' },
    })
    const today = new Date().toISOString().split('T')[0]
    const cache: Record<string, { input: number; output: number }> = {}
    for (const p of pricings) {
      if (p.effectiveFrom <= today && (!p.effectiveTo || p.effectiveTo >= today)) {
        cache[p.model] = { input: p.inputPricePer1M, output: p.outputPricePer1M }
      }
    }
    priceCache = cache
    cacheLoadedAt = Date.now()
  } catch {
    // Keep existing cache or fallback
  }
}

export async function getModelPricing(
  providerType: ProviderType,
  model: string,
  date: string,
  token: string,
): Promise<{ input: number; output: number }> {
  try {
    const pricings = await bkend.get<ModelPricing[]>('/model-pricings', {
      token,
      params: {
        providerType,
        model,
        effectiveFrom_lte: date,
      },
    })

    const activePricing = pricings.find(
      (p) => !p.effectiveTo || p.effectiveTo >= date,
    )

    if (activePricing) {
      return {
        input: activePricing.inputPricePer1M,
        output: activePricing.outputPricePer1M,
      }
    }
  } catch {
    // DB lookup failed, use fallback
  }

  return FALLBACK_PRICING[model] ?? { input: 1, output: 2 }
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: { input: number; output: number },
): number {
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

const DEFAULT_PRICINGS: Array<{
  providerType: ProviderType
  model: string
  inputPricePer1M: number
  outputPricePer1M: number
}> = [
  { providerType: 'openai', model: 'gpt-4o', inputPricePer1M: 2.5, outputPricePer1M: 10 },
  { providerType: 'openai', model: 'gpt-4o-mini', inputPricePer1M: 0.15, outputPricePer1M: 0.6 },
  { providerType: 'openai', model: 'gpt-4-turbo', inputPricePer1M: 10, outputPricePer1M: 30 },
  { providerType: 'openai', model: 'o1', inputPricePer1M: 15, outputPricePer1M: 60 },
  { providerType: 'openai', model: 'o1-mini', inputPricePer1M: 3, outputPricePer1M: 12 },
  { providerType: 'openai', model: 'o3-mini', inputPricePer1M: 1.1, outputPricePer1M: 4.4 },
  { providerType: 'anthropic', model: 'claude-opus-4-6', inputPricePer1M: 15, outputPricePer1M: 75 },
  { providerType: 'anthropic', model: 'claude-sonnet-4-5', inputPricePer1M: 3, outputPricePer1M: 15 },
  { providerType: 'anthropic', model: 'claude-haiku-4-5', inputPricePer1M: 0.8, outputPricePer1M: 4 },
  { providerType: 'google', model: 'gemini-2.0-flash', inputPricePer1M: 0.1, outputPricePer1M: 0.4 },
  { providerType: 'google', model: 'gemini-2.0-pro', inputPricePer1M: 1.25, outputPricePer1M: 5 },
  { providerType: 'google', model: 'gemini-1.5-pro', inputPricePer1M: 1.25, outputPricePer1M: 5 },
  { providerType: 'google', model: 'gemini-1.5-flash', inputPricePer1M: 0.075, outputPricePer1M: 0.3 },
]

export async function seedDefaultPricing(token: string): Promise<number> {
  let seeded = 0
  const today = new Date().toISOString().split('T')[0]

  for (const pricing of DEFAULT_PRICINGS) {
    try {
      const existing = await bkend.get<ModelPricing[]>('/model-pricings', {
        token,
        params: {
          providerType: pricing.providerType,
          model: pricing.model,
        },
      })

      if (existing.length === 0) {
        await bkend.post('/model-pricings', {
          ...pricing,
          effectiveFrom: today,
        }, { token })
        seeded++
      }
    } catch {
      // Skip if creation fails (e.g., table doesn't exist yet)
    }
  }

  return seeded
}

export async function updateModelPricing(
  data: {
    providerType: ProviderType
    model: string
    inputPricePer1M: number
    outputPricePer1M: number
    effectiveFrom: string
    effectiveTo?: string
  },
  token: string,
): Promise<ModelPricing> {
  return bkend.post<ModelPricing>('/model-pricings', data, { token })
}
