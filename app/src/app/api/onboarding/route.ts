import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'

interface DbUser {
  id: string
  plan?: string
  orgId?: string
  onboardingCompleted?: boolean
  onboardingStep?: number
}

// GET: 온보딩 상태 조회
export async function GET() {
  try {
    const me = await getMeServer()
    const users = await bkend.get<DbUser[]>('users', { params: { id: me.id } })

    if (users.length === 0) {
      return NextResponse.json({ onboardingCompleted: false, onboardingStep: 1 })
    }

    return NextResponse.json({
      onboardingCompleted: users[0].onboardingCompleted ?? false,
      onboardingStep: users[0].onboardingStep ?? 1,
    })
  } catch {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
}

// PUT: 온보딩 상태 업데이트
export async function PUT(req: Request) {
  let me
  try {
    me = await getMeServer()
  } catch {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.onboardingCompleted === 'boolean') {
      updates.onboardingCompleted = body.onboardingCompleted
    }
    if (typeof body.onboardingStep === 'number' && body.onboardingStep >= 1 && body.onboardingStep <= 5) {
      updates.onboardingStep = body.onboardingStep
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '업데이트할 필드가 없습니다' }, { status: 400 })
    }

    const users = await bkend.get<DbUser[]>('users', { params: { id: me.id } })
    if (users.length === 0) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    await bkend.patch(`users/${users[0].id}`, updates)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '업데이트 실패' },
      { status: 500 },
    )
  }
}
