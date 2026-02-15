import { NextRequest, NextResponse } from 'next/server'
import { bkend } from '@/lib/bkend'
import type { SyncHistory } from '@/types'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  const providerId = searchParams.get('providerId')
  const status = searchParams.get('status')
  const limit = searchParams.get('limit') || '20'
  const offset = searchParams.get('offset') || '0'

  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    const params: Record<string, string> = {
      orgId,
      _limit: limit,
      _offset: offset,
      _sort: '-startedAt',
    }

    if (providerId) params.providerId = providerId
    if (status) params.status = status

    const data = await bkend.get<SyncHistory[]>('/sync-histories', { token, params })

    const countParams: Record<string, string> = { orgId }
    if (providerId) countParams.providerId = providerId
    if (status) countParams.status = status

    const allRecords = await bkend.get<SyncHistory[]>('/sync-histories', { token, params: countParams })

    return NextResponse.json({
      data,
      meta: {
        total: allRecords.length,
        limit: Number(limit),
        offset: Number(offset),
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch sync history' },
      { status: 500 },
    )
  }
}
