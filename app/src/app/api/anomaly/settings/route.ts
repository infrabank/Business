import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { getSettings, updateSettings } from '@/services/anomaly.service'

async function verifyOrgAccess(userId: string, orgId: string): Promise<boolean> {
  try {
    const orgs = await bkend.get<Array<{ id: string }>>('/organizations', {
      params: { ownerId: userId },
    })
    return orgs.some((o) => o.id === orgId)
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  if (!(await verifyOrgAccess(authUser.id, orgId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const settings = await getSettings(orgId, token)
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  if (!(await verifyOrgAccess(authUser.id, orgId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { settingsId, ...updates } = body

  if (!settingsId) return NextResponse.json({ error: 'settingsId required' }, { status: 400 })

  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const settings = await updateSettings(settingsId, updates, token)
  return NextResponse.json(settings)
}
