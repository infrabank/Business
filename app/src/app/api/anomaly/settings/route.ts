import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { getSettings, updateSettings } from '@/services/anomaly.service'

export async function GET(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const settings = await getSettings(orgId, token)
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { settingsId, ...updates } = body

  if (!settingsId) return NextResponse.json({ error: 'settingsId required' }, { status: 400 })

  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const settings = await updateSettings(settingsId, updates, token)
  return NextResponse.json(settings)
}
