import type { ProviderType } from '@/types/provider'

export type DetectedProvider = ProviderType | null

export function detectProvider(
  body: Record<string, unknown>,
  path: string,
): DetectedProvider {
  // 1. Check model name prefix
  if (body.model && typeof body.model === 'string') {
    const model = body.model.toLowerCase()
    if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) {
      return 'openai'
    }
    if (model.startsWith('claude-')) {
      return 'anthropic'
    }
    if (model.startsWith('gemini-')) {
      return 'google'
    }
  }

  // 2. Check request format
  if (Array.isArray(body.messages)) {
    if (typeof body.system === 'string') {
      return 'anthropic'
    }
    return 'openai'
  }
  if (Array.isArray(body.contents)) {
    return 'google'
  }

  // 3. Check path hints
  if (path.includes('chat/completions')) return 'openai'
  if (path.includes('messages')) return 'anthropic'
  if (path.includes('generateContent')) return 'google'

  return null
}
