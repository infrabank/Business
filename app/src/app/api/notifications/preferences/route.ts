import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { getPreferences, updatePreferences } from '@/services/notification.service'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getMeServer()
    const orgId = req.nextUrl.searchParams.get('orgId') || authUser.id
    const prefs = await getPreferences(orgId, '')
    return NextResponse.json(prefs)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await getMeServer()
    const body = await req.json()
    const { prefsId, enabled, digestEnabled, digestTime, timezone, deliveryMode } = body

    if (!prefsId) {
      return NextResponse.json({ error: 'prefsId required' }, { status: 400 })
    }

    const updated = await updatePreferences(
      prefsId,
      { enabled, digestEnabled, digestTime, timezone, deliveryMode },
      '',
    )
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
