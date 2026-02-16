/**
 * Smart Model Router Service
 *
 * Automatically routes LLM requests to cheaper model alternatives based on token estimation.
 * Routing logic: requests < 500 tokens use cheaper alternatives, complex tasks keep original model.
 */

// Local pricing copy to avoid circular dependencies
const PRICING: Record<string, { input: number; output: number }> = {
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

// Model routing alternatives map
const MODEL_ALTERNATIVES: Record<string, string> = {
  'gpt-4o': 'gpt-4o-mini',
  'gpt-4-turbo': 'gpt-4o-mini',
  'o1': 'o3-mini',
  'claude-opus-4-6': 'claude-sonnet-4-5',
  'claude-sonnet-4-5': 'claude-haiku-4-5',
  'gemini-2.0-pro': 'gemini-2.0-flash',
  'gemini-1.5-pro': 'gemini-1.5-flash',
}

const TOKEN_THRESHOLD = 500 // Route to cheaper model if < 500 tokens

export interface RoutingResult {
  originalModel: string
  routedModel: string
  wasRouted: boolean
  estimatedSavingsPercent: number
  reason: string
}

/**
 * Estimate input tokens from request body
 * Uses rough heuristic: 1 token ≈ 4 characters
 */
function estimateInputTokens(body: Record<string, unknown>): number {
  let totalChars = 0

  // OpenAI/Anthropic format: messages array
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      if (typeof msg === 'object' && msg !== null) {
        const content = (msg as Record<string, unknown>).content
        if (typeof content === 'string') {
          totalChars += content.length
        } else if (Array.isArray(content)) {
          // Multi-modal content array
          for (const part of content) {
            if (typeof part === 'object' && part !== null) {
              const text = (part as Record<string, unknown>).text
              if (typeof text === 'string') {
                totalChars += text.length
              }
            }
          }
        }
      }
    }
  }

  // Google Gemini format: contents array
  if (Array.isArray(body.contents)) {
    for (const content of body.contents) {
      if (typeof content === 'object' && content !== null) {
        const parts = (content as Record<string, unknown>).parts
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (typeof part === 'object' && part !== null) {
              const text = (part as Record<string, unknown>).text
              if (typeof text === 'string') {
                totalChars += text.length
              }
            }
          }
        }
      }
    }
  }

  // Convert chars to tokens (rough estimate: 1 token ≈ 4 chars)
  return Math.ceil(totalChars / 4)
}

/**
 * Calculate average cost for a model (input + output average)
 */
function getModelCost(model: string): number {
  const pricing = PRICING[model]
  if (!pricing) return 0
  return (pricing.input + pricing.output) / 2
}

/**
 * Calculate savings percentage between two models
 */
function calculateSavingsPercent(originalModel: string, cheaperModel: string): number {
  const originalCost = getModelCost(originalModel)
  const cheaperCost = getModelCost(cheaperModel)

  if (originalCost === 0 || cheaperCost === 0) return 0

  return ((1 - cheaperCost / originalCost) * 100)
}

/**
 * Route model based on token estimation and routing rules
 */
export function routeModel(
  originalModel: string,
  body: Record<string, unknown>,
  enableRouting: boolean
): RoutingResult {
  // If routing disabled, return original model
  if (!enableRouting) {
    return {
      originalModel,
      routedModel: originalModel,
      wasRouted: false,
      estimatedSavingsPercent: 0,
      reason: 'Routing disabled',
    }
  }

  // If no alternative exists, return original model
  const alternative = MODEL_ALTERNATIVES[originalModel]
  if (!alternative) {
    return {
      originalModel,
      routedModel: originalModel,
      wasRouted: false,
      estimatedSavingsPercent: 0,
      reason: 'No alternative model available',
    }
  }

  // Estimate input tokens
  const estimatedTokens = estimateInputTokens(body)

  // Route to cheaper model if below threshold
  if (estimatedTokens < TOKEN_THRESHOLD) {
    const savingsPercent = calculateSavingsPercent(originalModel, alternative)
    return {
      originalModel,
      routedModel: alternative,
      wasRouted: true,
      estimatedSavingsPercent: Math.round(savingsPercent),
      reason: `Simple task (${estimatedTokens} tokens < ${TOKEN_THRESHOLD}) routed to cheaper alternative`,
    }
  }

  // Keep original model for complex tasks
  return {
    originalModel,
    routedModel: originalModel,
    wasRouted: false,
    estimatedSavingsPercent: 0,
    reason: `Complex task (${estimatedTokens} tokens >= ${TOKEN_THRESHOLD}) kept on original model`,
  }
}

/**
 * Calculate dollar savings from routing
 */
export function calculateRoutingSavings(
  originalModel: string,
  routedModel: string,
  inputTokens: number,
  outputTokens: number
): number {
  const originalPricing = PRICING[originalModel]
  const routedPricing = PRICING[routedModel]

  if (!originalPricing || !routedPricing) return 0

  const originalCost =
    (originalPricing.input * inputTokens) / 1_000_000 +
    (originalPricing.output * outputTokens) / 1_000_000

  const routedCost =
    (routedPricing.input * inputTokens) / 1_000_000 +
    (routedPricing.output * outputTokens) / 1_000_000

  return Math.max(0, originalCost - routedCost)
}

/**
 * Get all available alternatives for a model with savings percentages
 */
export function getModelAlternatives(model: string): Array<{ model: string; savingsPercent: number }> {
  const alternatives: Array<{ model: string; savingsPercent: number }> = []

  // Direct alternative
  const directAlt = MODEL_ALTERNATIVES[model]
  if (directAlt) {
    alternatives.push({
      model: directAlt,
      savingsPercent: Math.round(calculateSavingsPercent(model, directAlt)),
    })
  }

  // Transitive alternatives (e.g., opus → sonnet → haiku)
  let current = directAlt
  while (current && MODEL_ALTERNATIVES[current]) {
    const next = MODEL_ALTERNATIVES[current]
    alternatives.push({
      model: next,
      savingsPercent: Math.round(calculateSavingsPercent(model, next)),
    })
    current = next
  }

  return alternatives
}
