import type { ProviderType } from '@/types'
import type { ProviderAdapter } from './base-adapter'
import { OpenAIAdapter } from './openai-adapter'
import { AnthropicAdapter } from './anthropic-adapter'
import { GoogleAdapter } from './google-adapter'
import { AzureOpenAIAdapter } from './azure-adapter'
import { BedrockAdapter } from './bedrock-adapter'

export type { ProviderAdapter, UsageData, FetchUsageOptions, FetchUsageResult, RateLimitConfig, PromptRequest, PromptResponse } from './base-adapter'
export { ProviderApiError } from './base-adapter'

export function createAdapter(type: ProviderType): ProviderAdapter {
  switch (type) {
    case 'openai': return new OpenAIAdapter()
    case 'anthropic': return new AnthropicAdapter()
    case 'google': return new GoogleAdapter()
    case 'azure': return new AzureOpenAIAdapter()
    case 'custom': return new BedrockAdapter()
    default: throw new Error(`Unsupported provider: ${type}`)
  }
}
