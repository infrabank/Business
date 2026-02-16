import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { bkend } from '@/lib/bkend'
import { getMeServer } from '@/lib/auth'
import type { User } from '@/types'
import type { PaymentHistory, BillingStatus } from '@/types/billing'

export async function GET() {
  try {
    let authUser
    try {
      authUser = await getMeServer()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await bkend.get<User>(`/users/${authUser.id}`)

    const subscription = {
      plan: user.plan || 'free',
      status: user.subscriptionStatus || 'active' as const,
      currentPeriodEnd: user.currentPeriodEnd || '',
      cancelAtPeriodEnd: user.cancelAtPeriodEnd || false,
      trialEnd: user.trialEnd,
      stripeCustomerId: user.stripeCustomerId,
      subscriptionId: user.subscriptionId,
    }

    // Fetch invoices from Stripe if customer exists
    let invoices: PaymentHistory[] = []
    if (user.stripeCustomerId) {
      try {
        const stripeInvoices = await getStripe().invoices.list({
          customer: user.stripeCustomerId,
          limit: 3,
        })

        invoices = stripeInvoices.data.map((inv) => ({
          id: inv.id,
          orgId: '',
          stripeInvoiceId: inv.id,
          amount: (inv.amount_paid ?? 0) / 100,
          currency: inv.currency ?? 'usd',
          status: inv.status === 'paid' ? 'paid' as const : 'pending' as const,
          description: inv.lines?.data?.[0]?.description || 'Subscription',
          paidAt: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : undefined,
          invoiceUrl: inv.hosted_invoice_url ?? undefined,
          createdAt: new Date(inv.created * 1000).toISOString(),
        }))
      } catch {
        console.error('[billing/status] Failed to fetch invoices')
      }
    }

    const response: BillingStatus = { subscription, invoices }
    return NextResponse.json(response)
  } catch (error) {
    console.error('[billing/status] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status fetch failed' },
      { status: 500 }
    )
  }
}
