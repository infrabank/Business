import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { deleteAccount } from '@/services/settings.service'
import { createClient } from '@supabase/supabase-js'
import type { Organization } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(request: Request) {
  try {
    const user = await getMeServer()
    const { confirmation } = await request.json()

    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: '확인을 위해 "DELETE"를 정확히 입력해주세요.' },
        { status: 400 },
      )
    }

    // Find user's org
    const orgs = await bkend.get<Organization[]>('/organizations', {
      params: { ownerId: user.id },
    })
    const orgId = orgs[0]?.id

    // Check for active Growth subscription
    if (orgId) {
      const users = await bkend.get<{ plan?: string; subscriptionStatus?: string }[]>('/users', {
        params: { id: user.id },
      })
      const dbUser = users[0]
      if (dbUser?.plan === 'growth' && dbUser?.subscriptionStatus === 'active') {
        return NextResponse.json(
          { error: 'Growth 구독을 먼저 해지해주세요. 설정 > 구독에서 결제 관리를 통해 해지할 수 있습니다.' },
          { status: 400 },
        )
      }
    }

    // Delete all data
    if (orgId) {
      await deleteAccount(user.id, orgId)
    } else {
      // No org, just delete user
      await bkend.delete(`/users/${user.id}`)
    }

    // Delete Supabase auth user
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
    await serviceClient.auth.admin.deleteUser(user.id)

    return NextResponse.json({ message: '계정이 삭제되었습니다.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete account'
    if (message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
