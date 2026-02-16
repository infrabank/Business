import { NextRequest, NextResponse } from 'next/server'
import { getStripe, priceIdToPlan } from '@/lib/stripe'
import { bkendService as bkend } from '@/lib/bkend'
import type Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
    } catch {
      console.error('[webhook] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (!userId || !session.subscription) break

        const subscription = await getStripe().subscriptions.retrieve(session.subscription as string)
        const firstItem = subscription.items.data[0]
        const priceId = firstItem?.price?.id || ''
        const plan = priceIdToPlan(priceId)

        await bkend.patch(`/users/${userId}`, {
          plan,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: firstItem
            ? new Date(firstItem.current_period_end * 1000).toISOString()
            : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const subItem = subscription.items.data[0]
        const priceId = subItem?.price?.id || ''
        const plan = priceIdToPlan(priceId)

        // Find user by stripeCustomerId
        const users = await bkend.get<{ id: string }[]>('/users', {
          params: { stripeCustomerId: customerId },
        })
        if (users.length === 0) break

        await bkend.patch(`/users/${users[0].id}`, {
          plan,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: subItem
            ? new Date(subItem.current_period_end * 1000).toISOString()
            : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const users = await bkend.get<{ id: string }[]>('/users', {
          params: { stripeCustomerId: customerId },
        })
        if (users.length === 0) break

        await bkend.patch(`/users/${users[0].id}`, {
          plan: 'free',
          subscriptionId: null,
          subscriptionStatus: 'canceled',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          trialEnd: null,
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const users = await bkend.get<{ id: string }[]>('/users', {
          params: { stripeCustomerId: customerId },
        })
        if (users.length === 0) break

        // Record payment history
        const orgs = await bkend.get<{ id: string }[]>('/organizations', {
          params: { ownerId: users[0].id },
        })
        if (orgs.length > 0) {
          await bkend.post('/payment-history', {
            orgId: orgs[0].id,
            stripeInvoiceId: invoice.id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency || 'usd',
            status: 'paid',
            description: invoice.lines?.data?.[0]?.description || 'Subscription payment',
            paidAt: new Date().toISOString(),
            invoiceUrl: invoice.hosted_invoice_url || '',
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const users = await bkend.get<{ id: string }[]>('/users', {
          params: { stripeCustomerId: customerId },
        })
        if (users.length === 0) break

        await bkend.patch(`/users/${users[0].id}`, {
          subscriptionStatus: 'past_due',
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
