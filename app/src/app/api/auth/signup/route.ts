import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

const SIGNUP_LIMIT = 5
const SIGNUP_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const signupAttempts = new Map<string, { count: number; resetAt: number }>()

function checkSignupRate(ip: string): boolean {
  const now = Date.now()
  const entry = signupAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    signupAttempts.set(ip, { count: 1, resetAt: now + SIGNUP_WINDOW_MS })
    return true
  }
  if (entry.count >= SIGNUP_LIMIT) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkSignupRate(ip)) {
      return NextResponse.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 })
    }

    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email.split('@')[0] },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      user: { id: data.user.id, email: data.user.email },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Signup failed' },
      { status: 500 }
    )
  }
}
