import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { getApiKeySummary } from '@/services/settings.service'

export async function GET(req: NextRequest) {
  try {
    await getMeServer()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    const keys = await getApiKeySummary(orgId)
    return NextResponse.json(keys)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
