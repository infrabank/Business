import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { createAdapter } from '@/services/providers'
import { decrypt } from '@/services/encryption.service'
import { checkPlaygroundLimit } from '@/lib/plan-limits'
import type { Provider, ApiKey, ProviderType, UserPlan } from '@/types'
import type { PlaygroundExecuteRequest } from '@/types/playground'

export async function POST(req: Request) {
  let user
  try {
    user = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as PlaygroundExecuteRequest

    if (!body.providerId || !body.userPrompt || !body.model) {
      return NextResponse.json(
        { error: '프로바이더, 모델, 프롬프트는 필수입니다.' },
        { status: 400 },
      )
    }

    // Get user plan
    const users = await bkend.get<Array<{ plan?: string; orgId?: string }>>('/users', { params: { id: user.id } })
    const plan = (users[0]?.plan || 'free') as UserPlan
    const orgId = users[0]?.orgId

    if (!orgId) {
      return NextResponse.json({ error: '조직을 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0]
    const todayHistory = await bkend.get<Array<{ id: string }>>('/playground-history', {
      params: { userId: user.id, createdAt_gte: `${today}T00:00:00.000Z` },
    })
    const limitCheck = checkPlaygroundLimit(plan, todayHistory.length)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `오늘의 실행 한도(${limitCheck.limit}회)에 도달했습니다. Growth 플랜으로 업그레이드하세요.` },
        { status: 403 },
      )
    }

    // Get provider
    const providers = await bkend.get<Provider[]>('/providers', {
      params: { id: body.providerId, orgId },
    })
    if (providers.length === 0) {
      return NextResponse.json({ error: '프로바이더를 찾을 수 없습니다.' }, { status: 404 })
    }
    const provider = providers[0]

    // Get API key
    const apiKeys = await bkend.get<(ApiKey & { encryptedKey: string })[]>('/api-keys', {
      params: { providerId: provider.id, isActive: 'true' },
    })
    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'API 키가 등록되지 않았습니다. 프로바이더 설정에서 키를 추가하세요.' },
        { status: 404 },
      )
    }

    const apiKey = decrypt(apiKeys[0].encryptedKey)
    const adapter = createAdapter(provider.type as ProviderType)

    // Execute prompt
    const startTime = performance.now()
    const result = await adapter.executePrompt(apiKey, {
      model: body.model,
      systemPrompt: body.systemPrompt,
      userPrompt: body.userPrompt,
      temperature: Math.min(2, Math.max(0, body.temperature ?? 1)),
      maxTokens: Math.min(4096, Math.max(1, body.maxTokens ?? 1024)),
    })
    const responseTimeMs = Math.round(performance.now() - startTime)

    // Calculate cost
    const pricing = adapter.getModelPricing(body.model)
    const cost = (result.inputTokens * pricing.input + result.outputTokens * pricing.output) / 1_000_000

    // Save to history
    await bkend.post('/playground-history', {
      orgId,
      userId: user.id,
      provider: provider.type,
      model: result.model,
      systemPrompt: body.systemPrompt || null,
      userPrompt: body.userPrompt,
      response: result.content.slice(0, 32_000),
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost,
      responseTimeMs,
      temperature: body.temperature ?? 1,
      maxTokens: body.maxTokens ?? 1024,
    })

    return NextResponse.json({
      response: result.content,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost,
      responseTimeMs,
      model: result.model,
      provider: provider.type,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json(
        { error: '응답 시간이 초과되었습니다. 더 짧은 프롬프트나 작은 모델을 시도하세요.' },
        { status: 408 },
      )
    }
    // Forward provider rate limit errors
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 429) {
      return NextResponse.json(
        { error: '프로바이더 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.' },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '실행에 실패했습니다.' },
      { status: 500 },
    )
  }
}
