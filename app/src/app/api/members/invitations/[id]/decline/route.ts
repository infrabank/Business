import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { declineInvitation } from '@/services/member.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    try {
      await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await declineInvitation(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json(
      { error: msg },
      { status: msg === 'INVITATION_NOT_PENDING' ? 409 : 500 }
    )
  }
}
