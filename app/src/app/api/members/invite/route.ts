import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { resolveOrgAndRole, inviteMember } from '@/services/member.service'
import type { User } from '@/types'

export async function POST(request: NextRequest) {
  try {
    let authUser
    try {
      authUser = await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'email and role required' }, { status: 400 })
    }
    if (!['admin', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { orgId, memberRole } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
    if (memberRole !== 'owner' && memberRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await bkend.get<User>(`/users/${authUser.id}`)
    const invitation = await inviteMember(orgId, email, role, authUser.id, user.plan || 'free')
    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const statusMap: Record<string, number> = {
      PLAN_REQUIRED: 403,
      MEMBER_LIMIT_REACHED: 403,
      ALREADY_INVITED: 409,
      ALREADY_MEMBER: 409,
    }
    return NextResponse.json({ error: msg }, { status: statusMap[msg] || 500 })
  }
}
