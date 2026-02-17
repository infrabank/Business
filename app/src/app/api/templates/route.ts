import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { checkTemplateLimit } from '@/lib/plan-limits'
import { detectVariables } from '@/features/templates/utils/variables'
import type { PromptTemplate, CreateTemplateRequest } from '@/types/template'
interface DbUser { plan?: string; orgId?: string }

export async function GET(request: NextRequest) {
  try {
    const me = await getMeServer()
    if (!me) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const users = await bkend.get<DbUser[]>('users', { params: { id: me.id } })
    const orgId = users?.[0]?.orgId
    if (!orgId) {
      return NextResponse.json({ data: [], total: 0 })
    }

    const { searchParams } = request.nextUrl
    const category = searchParams.get('category') || ''
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'recent'
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Number(searchParams.get('offset')) || 0

    // Sort mapping
    const sortMap: Record<string, { _sort: string; _order: string }> = {
      recent: { _sort: 'updatedAt', _order: 'desc' },
      name: { _sort: 'name', _order: 'asc' },
      created: { _sort: 'createdAt', _order: 'desc' },
      usage: { _sort: 'usageCount', _order: 'desc' },
    }
    const { _sort, _order } = sortMap[sort] || sortMap.recent

    // Build query params
    const params: Record<string, string> = {
      orgId,
      _sort,
      _order,
      _limit: String(limit),
      _offset: String(offset),
    }
    if (category) params.category = category
    if (search) params.q = search

    // Fetch templates + count
    const [ownResult, countResult] = await Promise.all([
      bkend.get<PromptTemplate[]>('prompt_templates', { params }),
      bkend.get<PromptTemplate[]>('prompt_templates', { params: { orgId, _limit: '0' } }),
    ])

    const templates = ownResult || []
    const total = Array.isArray(countResult) ? countResult.length : templates.length

    return NextResponse.json({ data: templates, total })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const me = await getMeServer()
    if (!me) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const users = await bkend.get<DbUser[]>('users', { params: { id: me.id } })
    const orgId = users?.[0]?.orgId
    if (!orgId) {
      return NextResponse.json({ error: '조직 정보를 찾을 수 없습니다.' }, { status: 400 })
    }

    const body: CreateTemplateRequest = await request.json()

    if (!body.name?.trim() || !body.userPrompt?.trim()) {
      return NextResponse.json(
        { error: '템플릿 이름과 유저 프롬프트는 필수입니다.' },
        { status: 400 },
      )
    }

    // Check plan limit
    const plan = (users[0]?.plan || 'free') as import('@/types').UserPlan
    const existing = await bkend.get<PromptTemplate[]>('prompt_templates', {
      params: { userId: me.id, _limit: '0' },
    })
    const currentCount = Array.isArray(existing) ? existing.length : 0
    const limitCheck = checkTemplateLimit(plan, currentCount)

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Free 플랜은 최대 ${limitCheck.limit}개의 템플릿을 사용할 수 있습니다.`,
          planRequired: 'growth',
        },
        { status: 403 },
      )
    }

    // Auto-detect variables if not provided
    const variables = body.variables || detectVariables(body.systemPrompt, body.userPrompt)

    const template = await bkend.post<PromptTemplate>('prompt_templates', {
      orgId,
      userId: me.id,
      name: body.name.trim(),
      description: body.description?.trim() || '',
      category: body.category || 'other',
      systemPrompt: body.systemPrompt || '',
      userPrompt: body.userPrompt,
      variables: JSON.stringify(variables),
      defaultModel: body.defaultModel || '',
      defaultProvider: body.defaultProvider || '',
      defaultTemperature: body.defaultTemperature ?? null,
      defaultMaxTokens: body.defaultMaxTokens ?? null,
      visibility: body.visibility || 'private',
      isFavorite: false,
      usageCount: 0,
    })

    return NextResponse.json(template, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
