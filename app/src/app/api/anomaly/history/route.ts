import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { getAnomalyHistory } from '@/services/anomaly.service'

export async function GET(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const days = Number(req.nextUrl.searchParams.get('days') ?? '30')
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const events = await getAnomalyHistory(orgId, token, days)
  return NextResponse.json(events)
}
