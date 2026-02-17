import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { updateChannel, deleteChannel } from '@/services/notification.service'
import type { ChannelType } from '@/types/notification'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getMeServer()
    const { id } = await params
    const body = await req.json()
    const { name, enabled, config, alertTypes, severityFilter, channelType } = body

    const updated = await updateChannel(
      id,
      { name, enabled, config, alertTypes, severityFilter },
      channelType as ChannelType,
      '',
    )
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getMeServer()
    const { id } = await params
    await deleteChannel(id, '')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
