import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { createAdapter } from '@/services/providers'
import type { ProviderType } from '@/types'

export async function POST(req: Request) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { providerType, apiKey } = await req.json()

    if (!providerType || !apiKey) {
      return NextResponse.json({ error: 'providerType and apiKey are required' }, { status: 400 })
    }

    const adapter = createAdapter(providerType as ProviderType)
    const isValid = await adapter.validateKey(apiKey)

    return NextResponse.json({
      valid: isValid,
      provider: providerType,
      models: isValid ? adapter.getAvailableModels() : [],
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Validation failed' },
      { status: 500 },
    )
  }
}
