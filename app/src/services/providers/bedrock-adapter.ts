import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'
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
 * API key format: "region|access-key-id|secret-access-key"
 * e.g. "us-east-1|AKIA...|wJal..."
 */
export class BedrockAdapter implements ProviderAdapter {
  type = 'custom' as const

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

  private createClient(apiKey: string): BedrockRuntimeClient {
    const { region, accessKeyId, secretKey } = this.parseKey(apiKey)
    return new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey: secretKey,
      },
    })
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const { region, accessKeyId } = this.parseKey(apiKey)
      return !!(region && accessKeyId && /^[a-z]{2}-[a-z]+-\d$/.test(region))
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
    if (BEDROCK_MODELS[model]) return BEDROCK_MODELS[model]
    for (const [key, pricing] of Object.entries(BEDROCK_MODELS)) {
      if (model.includes(key) || key.includes(model)) return pricing
    }
    return { input: 0, output: 0 }
  }

  supportsUsageApi(): boolean {
    return false
  }

  async executePrompt(apiKey: string, request: PromptRequest): Promise<PromptResponse> {
    const client = this.createClient(apiKey)
    const modelId = request.model

    const isAnthropic = modelId.startsWith('anthropic.')
    const isMeta = modelId.startsWith('meta.')
    const isTitan = modelId.startsWith('amazon.titan')

    let body: Record<string, unknown>

    if (isAnthropic) {
      body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
        messages: [{ role: 'user', content: request.userPrompt }],
      }
    } else if (isMeta) {
      const prompt = request.systemPrompt
        ? `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${request.systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${request.userPrompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`
        : `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n${request.userPrompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`
      body = {
        prompt,
        max_gen_len: request.maxTokens,
        temperature: request.temperature,
      }
    } else if (isTitan) {
      body = {
        inputText: request.systemPrompt
          ? `${request.systemPrompt}\n\nUser: ${request.userPrompt}`
          : request.userPrompt,
        textGenerationConfig: {
          maxTokenCount: request.maxTokens,
          temperature: request.temperature,
        },
      }
    } else {
      // Mistral / Cohere / default - use messages format
      body = {
        prompt: request.systemPrompt
          ? `<s>[INST] ${request.systemPrompt}\n\n${request.userPrompt} [/INST]`
          : `<s>[INST] ${request.userPrompt} [/INST]`,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
      }
    }

    try {
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(JSON.stringify(body)),
      })

      const response = await client.send(command)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))

      // Parse response based on model type
      if (isAnthropic) {
        return {
          content: responseBody.content?.[0]?.text ?? '',
          inputTokens: responseBody.usage?.input_tokens ?? 0,
          outputTokens: responseBody.usage?.output_tokens ?? 0,
          model: modelId,
        }
      } else if (isMeta) {
        return {
          content: responseBody.generation ?? '',
          inputTokens: responseBody.prompt_token_count ?? 0,
          outputTokens: responseBody.generation_token_count ?? 0,
          model: modelId,
        }
      } else if (isTitan) {
        const result = responseBody.results?.[0]
        return {
          content: result?.outputText ?? '',
          inputTokens: responseBody.inputTextTokenCount ?? 0,
          outputTokens: result?.tokenCount ?? 0,
          model: modelId,
        }
      } else {
        // Mistral/Cohere
        return {
          content: responseBody.outputs?.[0]?.text ?? responseBody.generations?.[0]?.text ?? '',
          inputTokens: 0,
          outputTokens: 0,
          model: modelId,
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bedrock API error'
      throw new ProviderApiError(
        500,
        message,
        'bedrock'
      )
    }
  }
}
