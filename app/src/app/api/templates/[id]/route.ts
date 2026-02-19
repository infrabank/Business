import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { detectVariables } from '@/features/templates/utils/variables'
import type { PromptTemplate, UpdateTemplateRequest } from '@/types/template'
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await getMeServer()
    if (!me) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const template = await bkend.get<PromptTemplate>(`prompt_templates/${id}`)
    if (!template) {
      return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 })
    }

    // Verify access via members table (supports non-owner members)
    const memberships = await bkend.get<Array<{ orgId: string }>>('/members', { params: { userId: me.id } })
    const userOrgId = memberships[0]?.orgId
    if (template.userId !== me.id && !(template.orgId === userOrgId && template.visibility === 'shared')) {
      return NextResponse.json({ error: '이 템플릿에 접근 권한이 없습니다.' }, { status: 403 })
    }

    // Increment usage count (fire-and-forget)
    bkend.put(`prompt_templates/${id}`, {
      usageCount: (template.usageCount || 0) + 1,
    }).catch(() => {})

    return NextResponse.json(template)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await getMeServer()
    if (!me) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const template = await bkend.get<PromptTemplate>(`prompt_templates/${id}`)
    if (!template) {
      return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (template.userId !== me.id) {
      return NextResponse.json({ error: '템플릿 작성자만 수정할 수 있습니다.' }, { status: 403 })
    }

    const body: UpdateTemplateRequest = await request.json()

    // Re-detect variables if prompts changed
    const updates: Record<string, unknown> = { ...body }
    if (body.userPrompt || body.systemPrompt) {
      const newSystem = body.systemPrompt ?? template.systemPrompt
      const newUser = body.userPrompt ?? template.userPrompt
      const detectedVars = detectVariables(newSystem, newUser)

      // Merge with existing defaults
      const existingVars = Array.isArray(template.variables)
        ? template.variables
        : JSON.parse(String(template.variables || '[]'))
      const merged = detectedVars.map((v) => {
        const existing = existingVars.find((e: { name: string }) => e.name === v.name)
        return existing ? { ...v, defaultValue: existing.defaultValue } : v
      })
      updates.variables = JSON.stringify(merged)
    } else if (body.variables) {
      updates.variables = JSON.stringify(body.variables)
    }

    const updated = await bkend.put<PromptTemplate>(`prompt_templates/${id}`, updates)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await getMeServer()
    if (!me) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const template = await bkend.get<PromptTemplate>(`prompt_templates/${id}`)
    if (!template) {
      return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (template.userId !== me.id) {
      return NextResponse.json({ error: '템플릿 작성자만 삭제할 수 있습니다.' }, { status: 403 })
    }

    await bkend.delete(`prompt_templates/${id}`)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
