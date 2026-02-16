import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { bkend } from '@/lib/bkend'
import { getMeServer } from '@/lib/auth'
import type { User } from '@/types'

export async function POST(request: NextRequest) {
  try {
    let authUser
    try {
      authUser = await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await bkend.get<User>(`/users/${authUser.id}`)

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe to a plan first.' },
        { status: 400 }
      )
    }

    const origin = request.headers.get('origin') || ''
    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[billing/portal] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Portal session failed' },
      { status: 500 }
    )
  }
}
