import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { acceptInvitation } from '@/services/member.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    let authUser
    try {
      authUser = await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const member = await acceptInvitation(id, authUser.id)
    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const statusMap: Record<string, number> = {
      INVITATION_NOT_PENDING: 409,
      INVITATION_EXPIRED: 410,
    }
    return NextResponse.json({ error: msg }, { status: statusMap[msg] || 500 })
  }
}
