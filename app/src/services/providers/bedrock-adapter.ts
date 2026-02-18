import type { ProviderAdapter, FetchUsageOptions, FetchUsageResult, RateLimitConfig, PromptRequest, PromptResponse } from './base-adapter'
import { ProviderApiError } from './base-adapter'

/**
 * AWS Bedrock pricing per 1M tokens (on-demand, US East)
 */
const BEDROCK_MODELS: Record<string, { input: number; output: number }> = {
  'anthropic.claude-3-5-sonnet-20241022-v2:0': { input: 3, output: 15 },
  'anthropic.claude-3-5-haiku-20241022-v1:0': { input: 0.8, output: 4 },
  'anthropic.claude-3-opus-20240229-v1:0': { input: 15, output: 75 },
  'amazon.titan-text-express-v1': { input: 0.2, output: 0.6 },
  'amazon.titan-text-premier-v1:0': { input: 0.5, output: 1.5 },
  'meta.llama3-2-90b-instruct-v1:0': { input: 0.72, output: 0.72 },
  'meta.llama3-2-11b-instruct-v1:0': { input: 0.16, output: 0.16 },
  'mistral.mistral-large-2407-v1:0': { input: 2, output: 6 },
  'cohere.command-r-plus-v1:0': { input: 2.5, output: 10 },
}

/**
 * AWS Bedrock adapter
 *
 * API key format expected: "region|access-key-id|secret-access-key"
 * e.g. "us-east-1|AKIA...|wJal..."
 *
 * Uses the Bedrock runtime InvokeModel API with AWS Signature V4.
 * For simplicity, this adapter uses a pre-signed approach via the
 * standard AWS credential chain. In production, use IAM roles.
 *
 * NOTE: Full AWS SigV4 signing is complex. This adapter provides
 * the structure and interface. For production, integrate the
 * @aws-sdk/client-bedrock-runtime package.
 */
export class BedrockAdapter implements ProviderAdapter {
  type = 'custom' as const // Uses 'custom' since ProviderType doesn't have 'bedrock' yet

  rateLimitConfig: RateLimitConfig = {
    maxRequestsPerMinute: 30,
    delayBetweenRequestsMs: 2000,
  }

  private parseKey(apiKey: string): { region: string; accessKeyId: string; secretKey: string } {
    const parts = apiKey.split('|')
    if (parts.length !== 3) {
      throw new ProviderApiError(
        400,
        'Bedrock API key must be in format: region|access-key-id|secret-access-key',
        'bedrock'
      )
    }
    return { region: parts[0], accessKeyId: parts[1], secretKey: parts[2] }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const { region, accessKeyId } = this.parseKey(apiKey)
      // Basic format validation - full validation requires SigV4 signed request
      return !!(region && accessKeyId && region.match(/^[a-z]{2}-[a-z]+-\d$/))
    } catch {
      return false
    }
  }

  async fetchUsage(_apiKey: string, _from: Date, _to: Date, _options?: FetchUsageOptions): Promise<FetchUsageResult> {
    // Bedrock usage tracked via CloudWatch / proxy logs
    return { data: [], hasMore: false }
  }

  getAvailableModels(): string[] {
    return Object.keys(BEDROCK_MODELS)
  }

  getModelPricing(model: string): { input: number; output: number } {
    // Also try partial match for model ID variations
    if (BEDROCK_MODELS[model]) return BEDROCK_MODELS[model]
    for (const [key, pricing] of Object.entries(BEDROCK_MODELS)) {
      if (model.includes(key) || key.includes(model)) return pricing
    }
    return { input: 0, output: 0 }
  }

  supportsUsageApi(): boolean {
    return false // Usage tracked via proxy logs / CloudWatch
  }

  async executePrompt(apiKey: string, request: PromptRequest): Promise<PromptResponse> {
    const { region } = this.parseKey(apiKey)
    const modelId = request.model

    // Determine the request format based on model provider
    const isAnthropic = modelId.startsWith('anthropic.')
    const isMeta = modelId.startsWith('meta.')
    const isMistral = modelId.startsWith('mistral.')

    let body: Record<string, unknown>

    if (isAnthropic) {
      body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
        messages: [{ role: 'user', content: request.userPrompt }],
      }
    } else if (isMeta || isMistral) {
      const prompt = request.systemPrompt
        ? `<s>[INST] <<SYS>>\n${request.systemPrompt}\n<</SYS>>\n\n${request.userPrompt} [/INST]`
        : `<s>[INST] ${request.userPrompt} [/INST]`
      body = {
        prompt,
        max_gen_len: request.maxTokens,
        temperature: request.temperature,
      }
    } else {
      // Amazon Titan / default
      body = {
        inputText: request.systemPrompt
          ? `${request.systemPrompt}\n\nUser: ${request.userPrompt}`
          : request.userPrompt,
        textGenerationConfig: {
          maxTokenCount: request.maxTokens,
          temperature: request.temperature,
        },
      }
    }

    // NOTE: In production, this requires AWS SigV4 signing.
    // For now, this provides the correct API shape.
    // Install @aws-sdk/client-bedrock-runtime for full support.
    const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`

    throw new ProviderApiError(
      501,
      `Bedrock adapter requires @aws-sdk/client-bedrock-runtime for AWS SigV4 signing. ` +
      `Endpoint: ${endpoint}, Body shape: ${JSON.stringify(Object.keys(body))}. ` +
      `Install the AWS SDK and update this adapter for production use.`,
      'bedrock'
    )
  }
}
