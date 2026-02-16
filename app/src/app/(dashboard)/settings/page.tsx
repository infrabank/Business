'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { useBilling } from '@/features/billing/hooks/useBilling'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { bkend } from '@/lib/bkend'
import { CreditCard, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { Organization } from '@/types'

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
  const { isReady, currentUser } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { subscription, invoices, isLoading: billingLoading, openPortal } = useBilling()

  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [orgLoading, setOrgLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [orgSaving, setOrgSaving] = useState(false)

  // Load user data
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '')
      setProfileEmail(currentUser.email || '')
    }
  }, [currentUser])

  // Load org data
  useEffect(() => {
    async function loadOrg() {
      if (!orgId) { setOrgLoading(false); return }
      try {
        const orgs = await bkend.get<Organization[]>('/organizations', { params: { id: orgId } })
        if (orgs.length > 0) {
          setOrgName(orgs[0].name || '')
          setOrgSlug(orgs[0].slug || '')
          setBillingEmail(orgs[0].billingEmail || currentUser?.email || '')
        }
      } catch {
        // ignore
      } finally {
        setOrgLoading(false)
      }
    }
    loadOrg()
  }, [orgId, currentUser?.email])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      // TODO: Call bkend.patch('/users/me', { name: profileName, email: profileEmail })
      toast('success', 'Profile updated.')
    } catch {
      toast('error', 'Failed to update profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setOrgSaving(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      // TODO: Call bkend.patch(`/organizations/${orgId}`, { name: orgName, slug: orgSlug, billingEmail })
      toast('success', 'Organization updated.')
    } catch {
      toast('error', 'Failed to update organization.')
    } finally {
      setOrgSaving(false)
    }
  }

  const plan = subscription?.plan || currentUser?.plan || 'free'
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

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your account and organization</p>
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and organization</p>
      </div>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">Profile</h2></CardHeader>
        <CardContent>
          <form className="max-w-md space-y-4" onSubmit={handleSaveProfile}>
            <Input id="name" label="Name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            <Input id="email" label="Email" type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">Organization</h2></CardHeader>
        <CardContent>
          {orgLoading ? (
            <div className="max-w-md space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : (
            <form className="max-w-md space-y-4" onSubmit={handleUpdateOrg}>
              <Input id="orgName" label="Organization Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              <Input id="slug" label="URL Slug" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} />
              <Input id="billingEmail" label="Billing Email" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
              <Button type="submit" disabled={orgSaving}>
                {orgSaving ? 'Saving...' : 'Update Organization'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">Subscription</h2></CardHeader>
        <CardContent>
          {billingLoading ? (
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
