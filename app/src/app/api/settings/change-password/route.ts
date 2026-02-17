import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const user = await getMeServer()
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' },
        { status: 400 },
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: '새 비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 },
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: '새 비밀번호가 현재 비밀번호와 동일합니다.' },
        { status: 400 },
      )
    }

    // Step 1: Verify current password
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json(
        { error: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 400 },
      )
    }

    // Step 2: Update password via Admin API
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword },
    )

    if (updateError) {
      return NextResponse.json(
        { error: '비밀번호 변경에 실패했습니다.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ message: '비밀번호가 변경되었습니다.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to change password'
    if (message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
