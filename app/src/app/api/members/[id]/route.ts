import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { resolveOrgAndRole, updateMemberRole, removeMember } from '@/services/member.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    let authUser
    try {
      authUser = await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role } = await request.json()
    if (!role || !['admin', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { orgId, memberRole } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
    if (memberRole !== 'owner' && memberRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await updateMemberRole(id, orgId, role, memberRole)
    return NextResponse.json(updated)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const forbidden = ['FORBIDDEN', 'CANNOT_CHANGE_OWNER', 'USE_TRANSFER_OWNERSHIP']
    return NextResponse.json({ error: msg }, { status: forbidden.includes(msg) ? 403 : 500 })
  }
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

    await removeMember(id, orgId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const forbidden = ['FORBIDDEN', 'CANNOT_REMOVE_OWNER']
    return NextResponse.json({ error: msg }, { status: forbidden.includes(msg) ? 403 : 500 })
  }
}
