import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { resetOrgData } from '@/services/settings.service'
import type { Organization } from '@/types'

export async function DELETE(request: Request) {
  try {
    const user = await getMeServer()
    const { confirmation, orgId } = await request.json()

    if (!orgId) {
      return NextResponse.json({ error: '조직 ID가 필요합니다.' }, { status: 400 })
    }

    // Verify org ownership
    const orgs = await bkend.get<Organization[]>('/organizations', {
      params: { id: orgId },
    })
    if (orgs.length === 0) {
      return NextResponse.json({ error: '조직을 찾을 수 없습니다.' }, { status: 404 })
    }

    const orgName = orgs[0].name
    if (confirmation !== orgName) {
      return NextResponse.json(
        { error: `확인을 위해 "${orgName}"을(를) 정확히 입력해주세요.` },
        { status: 400 },
      )
    }

    // Verify the user owns this org (check members)
    const members = await bkend.get<{ userId: string; role: string }[]>('/members', {
      params: { orgId, userId: user.id },
    })
    if (members.length === 0 || members[0].role !== 'owner') {
      return NextResponse.json({ error: '조직 소유자만 데이터를 초기화할 수 있습니다.' }, { status: 403 })
    }

    const result = await resetOrgData(orgId)
    return NextResponse.json({ deleted: result.deleted, message: '데이터가 초기화되었습니다.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reset data'
    if (message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
