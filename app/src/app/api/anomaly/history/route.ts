import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { getAnomalyHistory } from '@/services/anomaly.service'

export async function GET(req: NextRequest) {
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  // Verify user has access to this organization
  try {
    const members = await bkend.get<Array<{ id: string }>>('/members', {
      params: { orgId, userId: authUser.id },
    })
    if (members.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const days = Number(req.nextUrl.searchParams.get('days') ?? '30')
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const events = await getAnomalyHistory(orgId, token, days)
  return NextResponse.json(events)
}
