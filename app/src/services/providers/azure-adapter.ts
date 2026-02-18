import type { ProviderAdapter, UsageData, FetchUsageOptions, FetchUsageResult, RateLimitConfig, PromptRequest, PromptResponse } from './base-adapter'
import { ProviderApiError } from './base-adapter'

/**
 * Azure OpenAI pricing per 1M tokens (same models, Azure-hosted)
 * Prices may vary by region; these are US East defaults
 */
const AZURE_MODELS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-35-turbo': { input: 0.5, output: 1.5 },
  'o1': { input: 15, output: 60 },
  'o3-mini': { input: 1.1, output: 4.4 },
}

/**
 * Azure OpenAI adapter
 *
 * API key format expected: "endpoint|api-key"
 * e.g. "https://myresource.openai.azure.com|abc123..."
 *
 * Azure OpenAI uses deployment names instead of model names in the URL.
 * The deployment name is typically the same as the model name but can differ.
 */
export class AzureOpenAIAdapter implements ProviderAdapter {
  type = 'azure' as const

  rateLimitConfig: RateLimitConfig = {
    maxRequestsPerMinute: 60,
    delayBetweenRequestsMs: 1000,
  }

  private parseKey(apiKey: string): { endpoint: string; key: string } {
    const parts = apiKey.split('|')
    if (parts.length !== 2) {
      throw new ProviderApiError(400, 'Azure API key must be in format: endpoint|api-key', 'azure')
    }
    return { endpoint: parts[0].replace(/\/$/, ''), key: parts[1] }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const { endpoint, key } = this.parseKey(apiKey)
      const res = await fetch(
        `${endpoint}/openai/models?api-version=2024-02-01`,
        {
          headers: { 'api-key': key },
        }
      )
      return res.ok
    } catch {
      return false
    }
  }

  async fetchUsage(apiKey: string, from: Date, to: Date, options?: FetchUsageOptions): Promise<FetchUsageResult> {
    // Azure OpenAI doesn't have a direct usage API like OpenAI
    // Usage tracking relies on our proxy logs, so return empty data
    // This is a known limitation documented for Azure users
    void apiKey
    void from
    void to
    void options
    return { data: [], hasMore: false }
  }

  getAvailableModels(): string[] {
    return Object.keys(AZURE_MODELS)
  }

  getModelPricing(model: string): { input: number; output: number } {
    return AZURE_MODELS[model] ?? { input: 0, output: 0 }
  }

  supportsUsageApi(): boolean {
    return false // Azure usage tracked via proxy logs
  }

  async executePrompt(apiKey: string, request: PromptRequest): Promise<PromptResponse> {
    const { endpoint, key } = this.parseKey(apiKey)
    const deploymentName = request.model

    const messages: Array<{ role: string; content: string }> = []
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }
    messages.push({ role: 'user', content: request.userPrompt })

    const res = await fetch(
      `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-01`,
      {
        method: 'POST',
        headers: {
          'api-key': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ProviderApiError(
        res.status,
        (err as { error?: { message?: string } }).error?.message || `Azure API error: ${res.status}`,
        'azure'
      )
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>
      usage: { prompt_tokens: number; completion_tokens: number }
      model: string
    }

    return {
      content: data.choices[0]?.message?.content ?? '',
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      model: data.model ?? request.model,
    }
  }
}
