import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { suppressPattern } from '@/services/anomaly.service'

export async function POST(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId, pattern } = await req.json()
  if (!orgId || !pattern) {
    return NextResponse.json({ error: 'orgId and pattern required' }, { status: 400 })
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const settings = await suppressPattern(orgId, pattern, token)
  return NextResponse.json(settings)
}
