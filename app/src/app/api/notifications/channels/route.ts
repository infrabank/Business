import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { getChannels, createChannel, maskConfig } from '@/services/notification.service'
import { isFeatureAvailable } from '@/lib/plan-limits'
import type { User } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getMeServer()
    const orgId = req.nextUrl.searchParams.get('orgId') || authUser.id
    const channels = await getChannels(orgId, '')
    const masked = channels.map((ch) => ({ ...ch, config: maskConfig(ch.type, ch.config) }))
    return NextResponse.json(masked)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getMeServer()
    const body = await req.json()
    const { orgId, type, name, config, alertTypes, severityFilter } = body

    if (!orgId || !type || !name || !config) {
      return NextResponse.json({ error: 'orgId, type, name, config required' }, { status: 400 })
    }

    // Plan gate: Free = email only, 1 channel max
    const users = await bkend.get<User[]>('/users', { params: { id: authUser.id } })
    const plan = users[0]?.plan || 'free'

    if (!isFeatureAvailable(plan, 'notifications')) {
      if (type !== 'email') {
        return NextResponse.json({ error: 'Free plan supports email only. Upgrade to Growth.' }, { status: 403 })
      }
      const existing = await getChannels(orgId, '')
      if (existing.length >= 1) {
        return NextResponse.json({ error: 'Free plan limited to 1 channel. Upgrade to Growth.' }, { status: 403 })
      }
    }

    const channel = await createChannel(orgId, { type, name, config, alertTypes: alertTypes || [], severityFilter }, '')
    return NextResponse.json(channel, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
