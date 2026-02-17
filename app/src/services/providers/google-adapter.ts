import type { ProviderAdapter, FetchUsageResult, RateLimitConfig, PromptRequest, PromptResponse } from './base-adapter'
import { ProviderApiError } from './base-adapter'

const GOOGLE_MODELS: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-pro': { input: 1.25, output: 5 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
}

export class GoogleAdapter implements ProviderAdapter {
  type = 'google' as const

  rateLimitConfig: RateLimitConfig = {
    maxRequestsPerMinute: 300,
    delayBetweenRequestsMs: 500,
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      )
      return res.ok
    } catch {
      return false
    }
  }

  async fetchUsage(): Promise<FetchUsageResult> {
    throw new ProviderApiError(
      501,
      'Google AI does not provide a standard usage API. Usage data can be imported via CSV or entered manually.',
      'google',
    )
  }

  getAvailableModels(): string[] {
    return Object.keys(GOOGLE_MODELS)
  }

  getModelPricing(model: string): { input: number; output: number } {
    return GOOGLE_MODELS[model] ?? { input: 0.5, output: 1.5 }
  }

  supportsUsageApi(): boolean {
    return false
  }

  async executePrompt(apiKey: string, request: PromptRequest): Promise<PromptResponse> {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []
    if (request.systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: request.systemPrompt }] })
      contents.push({ role: 'model', parts: [{ text: 'Understood.' }] })
    }
    contents.push({ role: 'user', parts: [{ text: request.userPrompt }] })

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: request.temperature,
            maxOutputTokens: request.maxTokens,
          },
        }),
        signal: AbortSignal.timeout(60_000),
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ProviderApiError(
        res.status,
        (err as { error?: { message?: string } }).error?.message || `Google AI error: ${res.statusText}`,
        'google',
      )
    }

    const data = await res.json() as GoogleGenerateResponse
    const content = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
    return {
      content,
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      model: request.model,
    }
  }
}

interface GoogleGenerateResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}
