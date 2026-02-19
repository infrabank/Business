/**
 * Guardrails Service
 *
 * Pre-request and post-response safety checks for the proxy pipeline.
 * Supports PII detection/masking, keyword blocking, and content length limits.
 * Configurable per proxy key.
 */

export interface GuardrailConfig {
  enablePiiMasking?: boolean
  enableKeywordBlock?: boolean
  blockedKeywords?: string[]
  maxInputLength?: number // max characters in input
  enableContentModeration?: boolean
}

export interface GuardrailResult {
  allowed: boolean
  modified: boolean
  reason?: string
  maskedBody?: Record<string, unknown>
}

// Common PII patterns (regex-based detection)
const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    name: 'phone_us',
    pattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    replacement: '[PHONE_REDACTED]',
  },
  {
    name: 'phone_kr',
    pattern: /0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
    replacement: '[PHONE_REDACTED]',
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
  },
  {
    name: 'credit_card',
    pattern: /\b\d{4}[-.\s]\d{4}[-.\s]\d{4}[-.\s]\d{4}\b/g,
    replacement: '[CC_REDACTED]',
  },
  {
    name: 'ip_address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_REDACTED]',
  },
  {
    name: 'korean_rrn',
    pattern: /\b\d{6}[-.\s]?\d{7}\b/g,
    replacement: '[RRN_REDACTED]',
  },
]

// Default harmful content keywords
const DEFAULT_BLOCKED_KEYWORDS = [
  'ignore previous instructions',
  'ignore all instructions',
  'disregard all previous',
  'you are now',
  'pretend you are',
  'jailbreak',
  'DAN mode',
]

/**
 * Extract all text content from a request body (provider-agnostic)
 */
function extractAllText(body: Record<string, unknown>): string {
  const parts: string[] = []

  // OpenAI / Anthropic messages
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      if (typeof msg.content === 'string') parts.push(msg.content)
      else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (typeof block === 'string') parts.push(block)
          else if (block?.text) parts.push(String(block.text))
        }
      }
    }
  }

  // Anthropic system
  if (typeof body.system === 'string') parts.push(body.system)

  // Google contents
  if (Array.isArray(body.contents)) {
    for (const c of body.contents) {
      if (Array.isArray(c?.parts)) {
        for (const p of c.parts) {
          if (typeof p?.text === 'string') parts.push(p.text)
        }
      }
    }
  }

  return parts.join('\n')
}

/**
 * Mask PII in text content
 */
function maskPii(text: string): { masked: string; found: string[] } {
  let masked = text
  const found: string[] = []

  for (const { name, pattern, replacement } of PII_PATTERNS) {
    const matches = masked.match(pattern)
    if (matches && matches.length > 0) {
      found.push(`${name}(${matches.length})`)
      masked = masked.replace(pattern, replacement)
    }
  }

  return { masked, found }
}

/**
 * Apply PII masking to the request body (deep clone + replace text)
 */
function maskBodyPii(body: Record<string, unknown>): { body: Record<string, unknown>; piiFound: string[] } {
  const allPiiFound: string[] = []
  const cloned = structuredClone(body)

  // Mask messages
  if (Array.isArray(cloned.messages)) {
    for (const msg of cloned.messages) {
      if (typeof msg.content === 'string') {
        const { masked, found } = maskPii(msg.content)
        msg.content = masked
        allPiiFound.push(...found)
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (typeof block === 'string') {
            const idx = msg.content.indexOf(block)
            const { masked, found } = maskPii(block)
            msg.content[idx] = masked
            allPiiFound.push(...found)
          } else if (block?.text) {
            const { masked, found } = maskPii(String(block.text))
            block.text = masked
            allPiiFound.push(...found)
          }
        }
      }
    }
  }

  // Mask system prompt
  if (typeof cloned.system === 'string') {
    const { masked, found } = maskPii(cloned.system)
    cloned.system = masked
    allPiiFound.push(...found)
  }

  // Mask Google contents
  if (Array.isArray(cloned.contents)) {
    for (const c of cloned.contents) {
      if (Array.isArray(c?.parts)) {
        for (const p of c.parts) {
          if (typeof p?.text === 'string') {
            const { masked, found } = maskPii(p.text)
            p.text = masked
            allPiiFound.push(...found)
          }
        }
      }
    }
  }

  return { body: cloned, piiFound: allPiiFound }
}

/**
 * Check for blocked keywords (prompt injection detection)
 */
function checkKeywords(text: string, blockedKeywords: string[]): string | null {
  const lowerText = text.toLowerCase()
  for (const keyword of blockedKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword
    }
  }
  return null
}

/**
 * Run guardrails on a request body before forwarding
 * Returns modified body if PII was masked, or blocks the request if rules violated
 */
export async function runGuardrails(
  body: Record<string, unknown>,
  config: GuardrailConfig
): Promise<GuardrailResult> {
  const text = extractAllText(body)

  // Check 1: Input length limit
  if (config.maxInputLength && text.length > config.maxInputLength) {
    return {
      allowed: false,
      modified: false,
      reason: `Input exceeds maximum length (${text.length} > ${config.maxInputLength} chars)`,
    }
  }

  // Check 2: Keyword blocking (prompt injection detection)
  if (config.enableKeywordBlock !== false) {
    const keywords = config.blockedKeywords?.length
      ? config.blockedKeywords
      : DEFAULT_BLOCKED_KEYWORDS
    const blockedKeyword = checkKeywords(text, keywords)
    if (blockedKeyword) {
      return {
        allowed: false,
        modified: false,
        reason: `Request blocked: contains prohibited content`,
      }
    }
  }

  // Check 3: PII masking (modifies body, doesn't block)
  if (config.enablePiiMasking) {
    const { body: maskedBody, piiFound } = maskBodyPii(body)
    if (piiFound.length > 0) {
      return {
        allowed: true,
        modified: true,
        maskedBody,
        reason: `PII detected and masked: ${piiFound.join(', ')}`,
      }
    }
  }

  // All checks passed, no modifications
  return { allowed: true, modified: false }
}

/**
 * Build a guardrail blocked response
 */
export function buildGuardrailBlockedResponse(reason: string): Response {
  return new Response(
    JSON.stringify({
      error: {
        message: reason,
        type: 'guardrail_blocked',
      },
    }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'x-guardrail-blocked': 'true',
      },
    },
  )
}
