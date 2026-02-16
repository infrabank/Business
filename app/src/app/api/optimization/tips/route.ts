import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { generateOptimizationTips } from '@/services/optimization.service'
import { bkend } from '@/lib/bkend'
import type { OptimizationTip } from '@/types'

export async function GET(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    const tips = await bkend.get<OptimizationTip[]>('/optimization-tips', {
      params: { orgId, status: 'pending' },
    })
    return NextResponse.json(tips)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load tips' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { orgId } = await req.json()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const tips = await generateOptimizationTips(orgId, '')
    return NextResponse.json(tips)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate tips' },
      { status: 500 },
    )
  }
}
