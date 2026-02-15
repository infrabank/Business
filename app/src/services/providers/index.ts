import type { ProviderType } from '@/types'
import type { ProviderAdapter } from './base-adapter'
import { OpenAIAdapter } from './openai-adapter'
import { AnthropicAdapter } from './anthropic-adapter'
import { GoogleAdapter } from './google-adapter'

export type { ProviderAdapter, UsageData } from './base-adapter'

export function createAdapter(type: ProviderType): ProviderAdapter {
  switch (type) {
    case 'openai': return new OpenAIAdapter()
    case 'anthropic': return new AnthropicAdapter()
    case 'google': return new GoogleAdapter()
    default: throw new Error(`Unsupported provider: ${type}`)
  }
}
