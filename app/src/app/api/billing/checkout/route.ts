import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_METERED_PRICE } from '@/lib/stripe'
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

    if (!STRIPE_METERED_PRICE) {
      return NextResponse.json({ error: 'Metered price not configured' }, { status: 500 })
    }

    // Check if user already has active subscription
    if (user.subscriptionStatus === 'active') {
      return NextResponse.json(
        { error: 'Already has active subscription. Use the billing portal to manage.' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      })
      customerId = customer.id

      await bkend.patch<User>(`/users/${user.id}`, {
        stripeCustomerId: customerId,
      })
    }

    // Create metered subscription checkout
    const origin = request.headers.get('origin') || ''
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: STRIPE_METERED_PRICE }],
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: { userId: user.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[billing/checkout] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}
