import type { ProviderType } from '@/types/provider'

interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  model: string
}

export function extractTokensFromJson(body: Record<string, unknown>, providerType: ProviderType): TokenUsage {
  switch (providerType) {
    case 'openai': {
      const usage = body.usage as Record<string, number> | undefined
      const model = (body.model as string) || 'unknown'
      return {
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        model,
      }
    }
    case 'anthropic': {
      const usage = body.usage as Record<string, number> | undefined
      const model = (body.model as string) || 'unknown'
      return {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        totalTokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
        model,
      }
    }
    case 'google': {
      const metadata = body.usageMetadata as Record<string, number> | undefined
      // Google model name is typically in modelVersion or the request
      const model = (body.modelVersion as string) || 'unknown'
      return {
        inputTokens: metadata?.promptTokenCount ?? 0,
        outputTokens: metadata?.candidatesTokenCount ?? 0,
        totalTokens: metadata?.totalTokenCount ?? 0,
        model,
      }
    }
    default:
      return { inputTokens: 0, outputTokens: 0, totalTokens: 0, model: 'unknown' }
  }
}

export function extractTokensFromSSEChunks(chunks: string[], providerType: ProviderType): TokenUsage {
  // Parse SSE chunks in reverse to find the last usage data
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i]
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)

        switch (providerType) {
          case 'openai': {
            // OpenAI includes usage in the last chunk when stream_options.include_usage is true
            if (parsed.usage) {
              return {
                inputTokens: parsed.usage.prompt_tokens ?? 0,
                outputTokens: parsed.usage.completion_tokens ?? 0,
                totalTokens: parsed.usage.total_tokens ?? 0,
                model: parsed.model || 'unknown',
              }
            }
            break
          }
          case 'anthropic': {
            // Anthropic sends message_delta with usage at the end
            if (parsed.type === 'message_delta' && parsed.usage) {
              return {
                inputTokens: 0, // input tokens are in message_start
                outputTokens: parsed.usage.output_tokens ?? 0,
                totalTokens: 0,
                model: '',
              }
            }
            if (parsed.type === 'message_start' && parsed.message) {
              // Capture input tokens and model from message_start
              return {
                inputTokens: parsed.message.usage?.input_tokens ?? 0,
                outputTokens: 0,
                totalTokens: 0,
                model: parsed.message.model || 'unknown',
              }
            }
            break
          }
          case 'google': {
            if (parsed.usageMetadata) {
              return {
                inputTokens: parsed.usageMetadata.promptTokenCount ?? 0,
                outputTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
                totalTokens: parsed.usageMetadata.totalTokenCount ?? 0,
                model: parsed.modelVersion || 'unknown',
              }
            }
            break
          }
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  }

  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, model: 'unknown' }
}

// For Anthropic streaming, we need to combine message_start and message_delta
export function mergeAnthropicStreamTokens(chunks: string[]): TokenUsage {
  let inputTokens = 0
  let outputTokens = 0
  let model = 'unknown'

  for (const chunk of chunks) {
    const lines = chunk.split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'message_start' && parsed.message) {
          inputTokens = parsed.message.usage?.input_tokens ?? 0
          model = parsed.message.model || model
        }
        if (parsed.type === 'message_delta' && parsed.usage) {
          outputTokens = parsed.usage.output_tokens ?? 0
        }
      } catch {
        // skip
      }
    }
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    model,
  }
}
