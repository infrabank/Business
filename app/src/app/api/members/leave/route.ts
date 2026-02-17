import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { resolveOrgAndRole, leaveOrg } from '@/services/member.service'

export async function POST() {
  try {
    let authUser
    try {
      authUser = await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })

    await leaveOrg(orgId, authUser.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json(
      { error: msg },
      { status: msg === 'OWNER_CANNOT_LEAVE' ? 403 : 500 }
    )
  }
}
