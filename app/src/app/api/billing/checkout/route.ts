import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
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

    const { priceId } = await request.json()

    // Fetch full user with Stripe fields
    const user = await bkend.get<User>(`/users/${authUser.id}`)

    // Validate price ID
    const validPrices = Object.values(STRIPE_PRICES).filter(Boolean)
    if (!priceId || !validPrices.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    // Check if user already has active subscription
    if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
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

      // Save stripeCustomerId
      await bkend.patch<User>(`/users/${user.id}`, {
        stripeCustomerId: customerId,
      })
    }

    // Determine if trial applies (starter and pro get 14-day trial)
    const isTrialEligible = priceId === STRIPE_PRICES.starter || priceId === STRIPE_PRICES.pro

    // Create checkout session
    const origin = request.headers.get('origin') || ''
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: isTrialEligible ? { trial_period_days: 14 } : undefined,
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
