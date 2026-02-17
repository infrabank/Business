import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { resolveOrgAndRole, getOrgMembers } from '@/services/member.service'

export async function GET() {
  try {
    let authUser
    try {
      authUser = await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json([])

    const members = await getOrgMembers(orgId)
    return NextResponse.json(members)
  } catch (error) {
    console.error('[members] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}
