import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { getLogs } from '@/services/notification.service'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getMeServer()
    const orgId = req.nextUrl.searchParams.get('orgId') || authUser.id
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30', 10)
    const logs = await getLogs(orgId, '', days)
    return NextResponse.json(logs)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
