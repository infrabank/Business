import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { createAdapter } from '@/services/providers'
import type { ProviderType } from '@/types'

function estimateTokens(text: string): number {
  const cjkPattern = /[\u3000-\u9fff\uac00-\ud7af]/g
  const cjkCount = (text.match(cjkPattern) || []).length
  const nonCjkCount = text.length - cjkCount
  return Math.ceil(cjkCount / 2 + nonCjkCount / 4)
}

export async function POST(req: Request) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { provider, model, systemPrompt, userPrompt } = await req.json()

    if (!provider || !model || !userPrompt) {
      return NextResponse.json({ error: 'provider, model, userPrompt are required' }, { status: 400 })
    }

    const fullText = (systemPrompt || '') + userPrompt
    const estimatedInputTokens = estimateTokens(fullText)

    const adapter = createAdapter(provider as ProviderType)
    const pricing = adapter.getModelPricing(model)
    const estimatedCost = (estimatedInputTokens * pricing.input) / 1_000_000

    return NextResponse.json({
      estimatedInputTokens,
      estimatedCost,
      modelPricing: pricing,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Estimation failed' },
      { status: 500 },
    )
  }
}
