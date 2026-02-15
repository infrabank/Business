import type { ProviderAdapter, UsageData } from './base-adapter'

const ANTHROPIC_MODELS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
}

export class AnthropicAdapter implements ProviderAdapter {
  type = 'anthropic' as const

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
      })
      return res.status !== 401
    } catch {
      return false
    }
  }

  async fetchUsage(_apiKey: string, from: Date, to: Date): Promise<UsageData[]> {
    return this.generateMockData(from, to)
  }

  getAvailableModels(): string[] {
    return Object.keys(ANTHROPIC_MODELS)
  }

  private generateMockData(from: Date, to: Date): UsageData[] {
    const data: UsageData[] = []
    const models = ['claude-sonnet-4-5', 'claude-haiku-4-5']
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      for (const model of models) {
        const p = ANTHROPIC_MODELS[model]!
        const inp = Math.floor(Math.random() * 300000) + 10000
        const out = Math.floor(Math.random() * 150000) + 5000
        data.push({
          model, inputTokens: inp, outputTokens: out,
          cost: Math.round((inp * p.input + out * p.output) / 1_000_000 * 1e6) / 1e6,
          requestCount: Math.floor(Math.random() * 300) + 30,
          date: d.toISOString().split('T')[0],
        })
      }
    }
    return data
  }
}
