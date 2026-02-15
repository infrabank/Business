'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useBilling } from '@/features/billing/hooks/useBilling'
import { CreditCard, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  active: 'success',
  trialing: 'info',
  past_due: 'warning',
  canceled: 'danger',
  unpaid: 'danger',
  incomplete: 'warning',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past Due',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
}

const PLAN_PRICE: Record<string, number> = {
  free: 0,
  starter: 29,
  pro: 99,
  enterprise: 299,
}

export default function SettingsPage() {
  const { subscription, invoices, isLoading, openPortal } = useBilling()

  const plan = subscription?.plan || 'free'
  const status = subscription?.status || 'active'
  const price = PLAN_PRICE[plan] || 0

  const trialDaysRemaining = subscription?.trialEnd
    ? Math.max(0, Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const nextBillingDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and organization</p>
      </div>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">Profile</h2></CardHeader>
        <CardContent>
          <form className="max-w-md space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input id="name" label="Name" defaultValue="Solo Founder" />
            <Input id="email" label="Email" type="email" defaultValue="founder@llmcost.io" />
            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">Organization</h2></CardHeader>
        <CardContent>
          <form className="max-w-md space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input id="orgName" label="Organization Name" defaultValue="My Company" />
            <Input id="slug" label="URL Slug" defaultValue="my-company" />
            <Input id="billingEmail" label="Billing Email" type="email" defaultValue="billing@company.com" />
            <Button type="submit">Update Organization</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">Subscription</h2></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-6 w-48 rounded bg-gray-200" />
              <div className="h-4 w-64 rounded bg-gray-200" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="info">{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</Badge>
                <Badge variant={STATUS_VARIANT[status] || 'info'}>
                  {STATUS_LABEL[status] || status}
                </Badge>
                {price > 0 && <span className="text-sm text-gray-600">${price}/month</span>}
              </div>

              {status === 'trialing' && trialDaysRemaining > 0 && (
                <p className="text-sm text-blue-600">
                  {trialDaysRemaining} days remaining in trial
                  {subscription?.trialEnd && (
                    <> &middot; Trial ends {new Date(subscription.trialEnd).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}</>
                  )}
                </p>
              )}

              {status === 'past_due' && (
                <p className="text-sm text-amber-600">
                  Payment failed. Please update your payment method to avoid service interruption.
                </p>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <p className="text-sm text-red-600">
                  Subscription will cancel at end of current period ({nextBillingDate})
                </p>
              )}

              {nextBillingDate && !subscription?.cancelAtPeriodEnd && plan !== 'free' && (
                <p className="text-sm text-gray-500">Next billing date: {nextBillingDate}</p>
              )}

              <div className="flex gap-3">
                {plan !== 'free' && subscription?.stripeCustomerId && (
                  <Button variant="outline" onClick={openPortal}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Billing
                  </Button>
                )}
                <Link href="/pricing">
                  <Button variant={plan === 'free' ? 'primary' : 'outline'}>
                    {plan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                  </Button>
                </Link>
              </div>

              {invoices.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-medium text-gray-700">Recent Invoices</h3>
                  <div className="divide-y rounded-lg border">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">
                            {new Date(inv.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            ${inv.amount.toFixed(2)}
                          </span>
                          <Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>
                            {inv.status}
                          </Badge>
                        </div>
                        {inv.invoiceUrl && (
                          <a
                            href={inv.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
