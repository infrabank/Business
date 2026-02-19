/**
 * Smart Model Router Service v3
 *
 * Routes LLM requests to cheaper model alternatives based on:
 * 1. Intent classification (hybrid: keywords + LLM fallback)
 * 2. Token estimation (input size heuristic)
 * 3. Structural signals (system prompts, tools, multimodal)
 *
 * Decision matrix: intent complexity × token count → route or keep
 */

import { getAllPricing } from '@/services/pricing.service'
import type { RoutingRule } from '@/types/proxy'

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

// ============================================================================
// Intent Classification
// ============================================================================

export type IntentCategory =
  | 'simple-qa'    // Factual lookups, definitions, simple questions
  | 'greeting'     // Hi, hello, thanks, small talk
  | 'translation'  // Language translation requests
  | 'coding'       // Code generation, review, debugging
  | 'analysis'     // Data analysis, comparisons, evaluations
  | 'creative'     // Creative writing, storytelling, brainstorming
  | 'reasoning'    // Math, logic, puzzles, step-by-step thinking
  | 'multimodal'   // Image/audio/file content in request
  | 'tool-use'     // Function calling / tool use requests
  | 'system-heavy' // Long system prompts (app integrations)
  | 'unknown'      // Cannot classify confidently

export interface IntentResult {
  category: IntentCategory
  confidence: number // 0-1
  routable: boolean  // Whether this intent can be routed to a cheaper model
  maxTokenThreshold: number // Token limit for routing (0 = never route)
}

// Keyword patterns for intent detection (case-insensitive)
const CODING_PATTERNS = [
  /\b(code|function|class|implement|debug|fix bug|refactor|program|script|api|endpoint|sql|query|algorithm|regex|typescript|javascript|python|java|rust|golang|html|css|react|component)\b/i,
  /```/,  // Code blocks
  /\b(import|export|const|let|var|def |func |fn |public|private|return|async|await)\b/,
  /[{}<>[\]();=]/,  // Code-like syntax patterns (3+ occurrences)
]

const REASONING_PATTERNS = [
  /\b(calculate|compute|solve|prove|derive|explain why|reason|step.by.step|think through|analyze the logic|what if|how would you|compare and contrast)\b/i,
  /\b(math|equation|formula|probability|statistics|theorem|hypothesis)\b/i,
  /\b(pros? and cons?|trade.?offs?|advantages? and disadvantages?)\b/i,
]

const CREATIVE_PATTERNS = [
  /\b(write a (story|poem|essay|article|blog|novel|screenplay)|creative|imagine|fiction|compose|brainstorm ideas|come up with)\b/i,
  /\b(rewrite|rephrase|paraphrase|make it sound|tone of voice|writing style)\b/i,
]

const ANALYSIS_PATTERNS = [
  /\b(analyze|evaluate|assess|review|critique|summarize this (document|article|paper|report)|break down|deep dive|research)\b/i,
  /\b(sentiment|classification|categorize|extract (data|information|entities|key))\b/i,
]

const TRANSLATION_PATTERNS = [
  /\b(translate|translation|in (korean|japanese|chinese|spanish|french|german|english|portuguese|italian|russian|arabic))\b/i,
  /\b(한국어로|일본어로|중국어로|영어로|번역|翻訳|翻译)\b/i,
]

const GREETING_PATTERNS = [
  /^(hi|hello|hey|howdy|good (morning|afternoon|evening)|thanks|thank you|bye|goodbye|안녕|감사|ありがとう|谢谢|hola|bonjour)\b/i,
  /^(what'?s up|how are you|nice to meet)\b/i,
]

const SIMPLE_QA_PATTERNS = [
  /^(what is|what are|who is|who was|when did|when was|where is|where are|how many|how much|how old|how far|how long|is it true|define|meaning of)\b/i,
  /\b(capital of|population of|founder of|ceo of|president of|definition of|what does .{1,30} mean)\b/i,
  /^(yes or no|true or false)[?:]/i,
  /\b(뭐야|뭔가요|무엇인가요|누구|언제|어디|몇|얼마)\b/i,
]

/**
 * Extract all text content from request body (supports OpenAI, Anthropic, Google formats)
 */
function extractTextContent(body: Record<string, unknown>): {
  userText: string
  systemText: string
  hasImages: boolean
  hasTools: boolean
  messageCount: number
} {
  let userText = ''
  let systemText = ''
  let hasImages = false
  let messageCount = 0

  // Check for tool/function calling
  const hasTools = !!(body.tools || body.functions || body.tool_choice)

  // OpenAI / Anthropic format: messages array
  if (Array.isArray(body.messages)) {
    messageCount = body.messages.length
    for (const msg of body.messages) {
      if (typeof msg !== 'object' || msg === null) continue
      const m = msg as Record<string, unknown>
      const role = m.role as string
      const content = m.content

      if (typeof content === 'string') {
        if (role === 'system') {
          systemText += content + ' '
        } else {
          userText += content + ' '
        }
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part !== 'object' || part === null) continue
          const p = part as Record<string, unknown>
          if (p.type === 'text' && typeof p.text === 'string') {
            if (role === 'system') {
              systemText += p.text + ' '
            } else {
              userText += p.text + ' '
            }
          }
          if (p.type === 'image_url' || p.type === 'image') {
            hasImages = true
          }
        }
      }
    }
  }

  // Anthropic: system can be top-level
  if (typeof body.system === 'string') {
    systemText += body.system + ' '
  }

  // Google Gemini format: contents array
  if (Array.isArray(body.contents)) {
    for (const content of body.contents) {
      if (typeof content !== 'object' || content === null) continue
      const c = content as Record<string, unknown>
      messageCount++
      const parts = c.parts
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (typeof part !== 'object' || part === null) continue
          const p = part as Record<string, unknown>
          if (typeof p.text === 'string') {
            userText += p.text + ' '
          }
          if (p.inlineData || p.fileData) {
            hasImages = true
          }
        }
      }
    }
  }

  return {
    userText: userText.trim(),
    systemText: systemText.trim(),
    hasImages,
    hasTools,
    messageCount,
  }
}

/**
 * Classify request intent based on keyword/pattern matching
 * Internal function - synchronous, zero-latency
 */
function classifyIntentByKeywords(userText: string, systemText: string): IntentResult {
  const fullText = userText + ' ' + systemText

  // Pattern-based classification (check most specific first)
  const scores: Array<{ category: IntentCategory; score: number; routable: boolean; maxTokenThreshold: number }> = []

  // Greeting — check first, very short
  const greetingScore = matchPatterns(userText, GREETING_PATTERNS)
  if (greetingScore > 0) {
    scores.push({ category: 'greeting', score: greetingScore + 0.3, routable: true, maxTokenThreshold: 1000 })
  }

  // Coding — high priority, never route
  const codingScore = matchPatterns(fullText, CODING_PATTERNS)
  if (codingScore > 0) {
    // Check for code syntax density (multiple code-like characters)
    const codeSyntaxCount = (fullText.match(/[{}<>[\]();=]/g) || []).length
    const boostedScore = codingScore + (codeSyntaxCount > 5 ? 0.3 : 0)
    scores.push({ category: 'coding', score: boostedScore, routable: false, maxTokenThreshold: 0 })
  }

  // Reasoning — never route
  const reasoningScore = matchPatterns(fullText, REASONING_PATTERNS)
  if (reasoningScore > 0) {
    scores.push({ category: 'reasoning', score: reasoningScore, routable: false, maxTokenThreshold: 0 })
  }

  // Creative writing — never route
  const creativeScore = matchPatterns(fullText, CREATIVE_PATTERNS)
  if (creativeScore > 0) {
    scores.push({ category: 'creative', score: creativeScore, routable: false, maxTokenThreshold: 0 })
  }

  // Analysis — never route
  const analysisScore = matchPatterns(fullText, ANALYSIS_PATTERNS)
  if (analysisScore > 0) {
    scores.push({ category: 'analysis', score: analysisScore, routable: false, maxTokenThreshold: 0 })
  }

  // Translation — route only short texts
  const translationScore = matchPatterns(fullText, TRANSLATION_PATTERNS)
  if (translationScore > 0) {
    scores.push({ category: 'translation', score: translationScore, routable: true, maxTokenThreshold: 300 })
  }

  // Simple QA — route with standard threshold
  const simpleQaScore = matchPatterns(userText, SIMPLE_QA_PATTERNS)
  if (simpleQaScore > 0) {
    scores.push({ category: 'simple-qa', score: simpleQaScore, routable: true, maxTokenThreshold: 500 })
  }

  // Pick highest scoring category
  if (scores.length > 0) {
    scores.sort((a, b) => b.score - a.score)
    const best = scores[0]
    return {
      category: best.category,
      confidence: Math.min(0.95, best.score),
      routable: best.routable,
      maxTokenThreshold: best.maxTokenThreshold,
    }
  }

  // Unknown — conservative routing with low threshold
  return { category: 'unknown', confidence: 0.3, routable: true, maxTokenThreshold: 200 }
}

/**
 * Classify request intent using OpenAI gpt-4o-mini
 * Returns null on any error (graceful degradation)
 */
async function classifyIntentByLLM(userText: string): Promise<IntentCategory | null> {
  const apiKey = process.env.ROUTER_CLASSIFIER_API_KEY
  if (!apiKey) return null

  const CLASSIFIER_PROMPT = `You are an intent classifier for LLM API requests. Classify the user's message into exactly one category.

Categories:
- greeting: Greetings, small talk, thanks, farewells
- simple-qa: Simple factual questions, definitions, lookups
- translation: Translation between languages
- coding: Code writing, debugging, review, implementation
- analysis: Data analysis, evaluation, comparison, research
- creative: Creative writing, storytelling, brainstorming
- reasoning: Math, logic, step-by-step thinking, puzzles

Respond with ONLY the category name in lowercase, nothing else.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: CLASSIFIER_PROMPT },
          { role: 'user', content: userText.slice(0, 500) }
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const category = data.choices?.[0]?.message?.content?.trim()?.toLowerCase()

    const validCategories: IntentCategory[] = [
      'greeting', 'simple-qa', 'translation', 'coding', 'analysis', 'creative', 'reasoning'
    ]

    if (validCategories.includes(category as IntentCategory)) {
      return category as IntentCategory
    }
    return null
  } catch {
    return null
  }
}

/**
 * Map LLM category to IntentResult with routing configuration
 */
function mapCategoryToIntentResult(category: IntentCategory): IntentResult {
  const INTENT_CONFIG: Record<string, { routable: boolean; maxTokenThreshold: number }> = {
    'greeting': { routable: true, maxTokenThreshold: 1000 },
    'simple-qa': { routable: true, maxTokenThreshold: 500 },
    'translation': { routable: true, maxTokenThreshold: 300 },
    'coding': { routable: false, maxTokenThreshold: 0 },
    'analysis': { routable: false, maxTokenThreshold: 0 },
    'creative': { routable: false, maxTokenThreshold: 0 },
    'reasoning': { routable: false, maxTokenThreshold: 0 },
    'multimodal': { routable: false, maxTokenThreshold: 0 },
    'tool-use': { routable: false, maxTokenThreshold: 0 },
    'system-heavy': { routable: false, maxTokenThreshold: 0 },
    'unknown': { routable: true, maxTokenThreshold: 200 },
  }
  const config = INTENT_CONFIG[category] || INTENT_CONFIG['unknown']
  return {
    category,
    confidence: 0.85, // LLM classification is higher confidence than keywords
    routable: config.routable,
    maxTokenThreshold: config.maxTokenThreshold,
  }
}

/**
 * Hybrid intent classification: structural signals → keywords → LLM fallback
 * Async function that uses LLM for uncertain cases
 */
async function classifyIntentHybrid(body: Record<string, unknown>): Promise<IntentResult> {
  const { userText, systemText, hasImages, hasTools, messageCount } = extractTextContent(body)

  // Step 1: Structural signals (instant, no LLM needed)
  if (hasImages) {
    return { category: 'multimodal', confidence: 0.95, routable: false, maxTokenThreshold: 0 }
  }

  if (hasTools) {
    return { category: 'tool-use', confidence: 0.95, routable: false, maxTokenThreshold: 0 }
  }

  // Long system prompts indicate app integrations that need full model quality
  if (systemText.length > 500) {
    return { category: 'system-heavy', confidence: 0.85, routable: false, maxTokenThreshold: 0 }
  }

  // Multi-turn conversations (>4 messages) suggest complex interactions
  if (messageCount > 4) {
    return { category: 'analysis', confidence: 0.6, routable: false, maxTokenThreshold: 0 }
  }

  // Step 2: Keyword patterns
  const keywordResult = classifyIntentByKeywords(userText, systemText)

  // High confidence keyword match → use it directly
  if (keywordResult.confidence >= 0.7) {
    return keywordResult
  }

  // Low confidence: use keyword result directly, fire LLM classification
  // asynchronously for telemetry (avoid blocking the hot path)
  classifyIntentByLLM(userText).catch(() => {})
  return keywordResult
}

/**
 * Classify request intent based on content analysis (backward compatible)
 * Synchronous, keyword-based only - for legacy usage
 */
export function classifyIntent(body: Record<string, unknown>): IntentResult {
  const { userText, systemText, hasImages, hasTools, messageCount } = extractTextContent(body)

  // Structural signals (highest priority — always block routing)
  if (hasImages) {
    return { category: 'multimodal', confidence: 0.95, routable: false, maxTokenThreshold: 0 }
  }

  if (hasTools) {
    return { category: 'tool-use', confidence: 0.95, routable: false, maxTokenThreshold: 0 }
  }

  // Long system prompts indicate app integrations that need full model quality
  if (systemText.length > 500) {
    return { category: 'system-heavy', confidence: 0.85, routable: false, maxTokenThreshold: 0 }
  }

  // Multi-turn conversations (>4 messages) suggest complex interactions
  if (messageCount > 4) {
    return { category: 'analysis', confidence: 0.6, routable: false, maxTokenThreshold: 0 }
  }

  return classifyIntentByKeywords(userText, systemText)
}

/**
 * Match text against pattern arrays, return aggregate score (0-1)
 */
function matchPatterns(text: string, patterns: RegExp[]): number {
  let matches = 0
  for (const pattern of patterns) {
    if (pattern.test(text)) matches++
  }
  return matches > 0 ? Math.min(0.9, 0.4 + matches * 0.2) : 0
}

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estimate input tokens from request body
 * Uses rough heuristic: 1 token ≈ 4 characters
 */
function estimateInputTokens(body: Record<string, unknown>): number {
  const { userText, systemText } = extractTextContent(body)
  const totalChars = userText.length + systemText.length
  return Math.ceil(totalChars / 4)
}

// ============================================================================
// Cost Calculation Helpers
// ============================================================================

function getModelCost(model: string): number {
  const pricing = getAllPricing()[model]
  if (!pricing) return 0
  return (pricing.input + pricing.output) / 2
}

function calculateSavingsPercent(originalModel: string, cheaperModel: string): number {
  const originalCost = getModelCost(originalModel)
  const cheaperCost = getModelCost(cheaperModel)
  if (originalCost === 0 || cheaperCost === 0) return 0
  return ((1 - cheaperCost / originalCost) * 100)
}

// ============================================================================
// Routing Decision
// ============================================================================

export interface RoutingResult {
  originalModel: string
  routedModel: string
  wasRouted: boolean
  estimatedSavingsPercent: number
  reason: string
  intent?: IntentCategory
}

/**
 * Route model based on intent classification + token estimation
 * Now async to support LLM-based classification
 *
 * Decision Matrix:
 * | Intent       | Routable? | Token Threshold |
 * |-------------|-----------|-----------------|
 * | greeting     | Yes       | 1000            |
 * | simple-qa    | Yes       | 500             |
 * | translation  | Yes       | 300             |
 * | unknown      | Yes       | 200             |
 * | coding       | No        | -               |
 * | reasoning    | No        | -               |
 * | creative     | No        | -               |
 * | analysis     | No        | -               |
 * | multimodal   | No        | -               |
 * | tool-use     | No        | -               |
 * | system-heavy | No        | -               |
 */
export async function routeModel(
  originalModel: string,
  body: Record<string, unknown>,
  enableRouting: boolean,
  routingMode: 'auto' | 'manual' | 'off' = 'auto',
  manualRules?: RoutingRule[],
): Promise<RoutingResult> {
  if (!enableRouting || routingMode === 'off') {
    return {
      originalModel,
      routedModel: originalModel,
      wasRouted: false,
      estimatedSavingsPercent: 0,
      reason: 'Routing disabled',
    }
  }

  // Manual routing mode: use user-defined rules
  if (routingMode === 'manual' && manualRules && manualRules.length > 0) {
    const rule = manualRules.find((r) => r.fromModel === originalModel)
    if (rule) {
      if (rule.condition === 'always') {
        const savingsPercent = calculateSavingsPercent(originalModel, rule.toModel)
        return {
          originalModel,
          routedModel: rule.toModel,
          wasRouted: true,
          estimatedSavingsPercent: Math.round(savingsPercent),
          reason: `Manual rule: always route ${originalModel} → ${rule.toModel}`,
        }
      }
      // For conditional rules, classify intent first
      const intent = await classifyIntentHybrid(body)
      const estimatedTokens = estimateInputTokens(body)
      if (
        (rule.condition === 'simple-only' && intent.routable) ||
        (rule.condition === 'short-only' && estimatedTokens < 500)
      ) {
        const savingsPercent = calculateSavingsPercent(originalModel, rule.toModel)
        return {
          originalModel,
          routedModel: rule.toModel,
          wasRouted: true,
          estimatedSavingsPercent: Math.round(savingsPercent),
          reason: `Manual rule (${rule.condition}): ${originalModel} → ${rule.toModel}`,
          intent: intent.category,
        }
      }
      return {
        originalModel,
        routedModel: originalModel,
        wasRouted: false,
        estimatedSavingsPercent: 0,
        reason: `Manual rule condition '${rule.condition}' not met`,
        intent: intent.category,
      }
    }
    // No matching rule for this model
    return {
      originalModel,
      routedModel: originalModel,
      wasRouted: false,
      estimatedSavingsPercent: 0,
      reason: 'No manual routing rule for this model',
    }
  }

  // Auto routing mode
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

  // Classify intent using hybrid approach (keywords + LLM fallback)
  const intent = await classifyIntentHybrid(body)
  const estimatedTokens = estimateInputTokens(body)

  // Non-routable intents: always keep original model
  if (!intent.routable) {
    return {
      originalModel,
      routedModel: originalModel,
      wasRouted: false,
      estimatedSavingsPercent: 0,
      reason: `${intent.category} intent detected (confidence: ${Math.round(intent.confidence * 100)}%) — kept on original model`,
      intent: intent.category,
    }
  }

  // Routable intents: check against intent-specific token threshold
  if (estimatedTokens < intent.maxTokenThreshold) {
    const savingsPercent = calculateSavingsPercent(originalModel, alternative)
    return {
      originalModel,
      routedModel: alternative,
      wasRouted: true,
      estimatedSavingsPercent: Math.round(savingsPercent),
      reason: `${intent.category} intent (${estimatedTokens} tokens < ${intent.maxTokenThreshold}) routed to ${alternative}`,
      intent: intent.category,
    }
  }

  // Routable intent but over token threshold
  return {
    originalModel,
    routedModel: originalModel,
    wasRouted: false,
    estimatedSavingsPercent: 0,
    reason: `${intent.category} intent but ${estimatedTokens} tokens >= ${intent.maxTokenThreshold} threshold — kept on original model`,
    intent: intent.category,
  }
}

// ============================================================================
// Savings Calculation
// ============================================================================

export function calculateRoutingSavings(
  originalModel: string,
  routedModel: string,
  inputTokens: number,
  outputTokens: number
): number {
  const prices = getAllPricing()
  const originalPricing = prices[originalModel]
  const routedPricing = prices[routedModel]
  if (!originalPricing || !routedPricing) return 0

  const originalCost =
    (originalPricing.input * inputTokens) / 1_000_000 +
    (originalPricing.output * outputTokens) / 1_000_000
  const routedCost =
    (routedPricing.input * inputTokens) / 1_000_000 +
    (routedPricing.output * outputTokens) / 1_000_000

  return Math.max(0, originalCost - routedCost)
}

export function getModelAlternatives(model: string): Array<{ model: string; savingsPercent: number }> {
  const alternatives: Array<{ model: string; savingsPercent: number }> = []

  const directAlt = MODEL_ALTERNATIVES[model]
  if (directAlt) {
    alternatives.push({
      model: directAlt,
      savingsPercent: Math.round(calculateSavingsPercent(model, directAlt)),
    })
  }

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
