import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { testChannel } from '@/services/notification.service'
import type { NotificationChannel, NotificationChannel as NC } from '@/types/notification'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getMeServer()
    const { id } = await params

    const channels = await bkend.get<NotificationChannel[]>('/notification-channels', {
      params: { id },
    })

    if (channels.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const channel = channels[0]

    // Get org name
    let orgName = 'My Organization'
    try {
      const orgs = await bkend.get<Array<{ name: string }>>('/organizations', {
        params: { id: channel.orgId },
      })
      if (orgs.length > 0) orgName = orgs[0].name
    } catch { /* fallback */ }

    const result = await testChannel(channel, orgName)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
