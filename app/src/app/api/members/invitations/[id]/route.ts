import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { resolveOrgAndRole, cancelInvitation } from '@/services/member.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    let authUser
    try {
      authUser = await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, memberRole } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
    if (memberRole !== 'owner' && memberRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await cancelInvitation(id, orgId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: msg === 'FORBIDDEN' ? 403 : 500 })
  }
}
