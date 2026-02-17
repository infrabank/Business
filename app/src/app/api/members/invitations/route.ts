import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { resolveOrgAndRole, getOrgInvitations } from '@/services/member.service'

export async function GET() {
  try {
    let authUser
    try {
      authUser = await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, memberRole } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json([])
    if (memberRole !== 'owner' && memberRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const invitations = await getOrgInvitations(orgId)
    return NextResponse.json(invitations)
  } catch (error) {
    console.error('[members/invitations] Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
