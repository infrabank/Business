import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { PlaygroundHistory } from '@/types/playground'

export async function GET(req: Request) {
  let user
  try {
    user = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(50, Number(searchParams.get('limit')) || 20)
    const offset = Number(searchParams.get('offset')) || 0

    const orgs = await bkend.get<Array<{ id: string }>>('/organizations', { params: { ownerId: user.id } })
    const orgId = orgs[0]?.id
    if (!orgId) {
      return NextResponse.json({ data: [], total: 0 })
    }

    const [history, allRecords] = await Promise.all([
      bkend.get<PlaygroundHistory[]>('/playground-history', {
        params: { orgId, _sort: 'createdAt', _order: 'desc', _limit: String(limit), _offset: String(offset) },
      }),
      bkend.get<PlaygroundHistory[]>('/playground-history', {
        params: { orgId },
      }),
    ])

    return NextResponse.json({
      data: history,
      total: allRecords.length,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch history' },
      { status: 500 },
    )
  }
}
