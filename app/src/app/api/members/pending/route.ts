import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { getPendingInvitesForUser } from '@/services/member.service'

export async function GET() {
  try {
    let authUser
    try {
      authUser = await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invitations = await getPendingInvitesForUser(authUser.email)
    return NextResponse.json(invitations)
  } catch (error) {
    console.error('[members/pending] Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
