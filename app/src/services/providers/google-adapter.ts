import type { ProviderAdapter, UsageData } from './base-adapter'

const GOOGLE_MODELS: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-pro': { input: 1.25, output: 5 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
}

export class GoogleAdapter implements ProviderAdapter {
  type = 'google' as const

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )
      return res.ok
    } catch {
      return false
    }
  }

  async fetchUsage(_apiKey: string, from: Date, to: Date): Promise<UsageData[]> {
    return this.generateMockData(from, to)
  }

  getAvailableModels(): string[] {
    return Object.keys(GOOGLE_MODELS)
  }

  private generateMockData(from: Date, to: Date): UsageData[] {
    const data: UsageData[] = []
    const models = ['gemini-2.0-flash', 'gemini-2.0-pro']
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      for (const model of models) {
        const p = GOOGLE_MODELS[model]!
        const inp = Math.floor(Math.random() * 400000) + 10000
        const out = Math.floor(Math.random() * 200000) + 5000
        data.push({
          model, inputTokens: inp, outputTokens: out,
          cost: Math.round((inp * p.input + out * p.output) / 1_000_000 * 1e6) / 1e6,
          requestCount: Math.floor(Math.random() * 400) + 40,
          date: d.toISOString().split('T')[0],
        })
      }
    }
    return data
  }
}
