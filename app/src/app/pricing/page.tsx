'use client'

import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { useAppStore } from '@/lib/store'
import { useBilling } from '@/features/billing/hooks/useBilling'
import { PLAN_RANK, STRIPE_PRICES } from '@/lib/constants'
import type { UserPlan } from '@/types'

const plans: {
  name: string
  key: UserPlan
  price: number
  description: string
  features: string[]
  popular: boolean
}[] = [
  {
    name: 'Free',
    key: 'free',
    price: 0,
    description: 'For individuals getting started',
    features: ['1 provider', '1 API key', '7-day history', 'Basic dashboard'],
    popular: false,
  },
  {
    name: 'Starter',
    key: 'starter',
    price: 29,
    description: 'For small teams and projects',
    features: ['3 providers', '10 API keys', '30-day history', 'Budget alerts', 'CSV export'],
    popular: false,
  },
  {
    name: 'Pro',
    key: 'pro',
    price: 99,
    description: 'For growing teams',
    features: [
      'Unlimited providers',
      'Unlimited API keys',
      '90-day history',
      'Advanced analytics',
      'Optimization tips',
      'Email alerts',
      'Team members',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    key: 'enterprise',
    price: 299,
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      '1-year history',
      'SSO / SAML',
      'Custom integrations',
      'Priority support',
      'SLA guarantee',
      'Audit logs',
    ],
    popular: false,
  },
]

export default function PricingPage() {
  const currentUser = useAppStore((s) => s.currentUser)
  const { subscription, createCheckout, openPortal } = useBilling()
  const isLoggedIn = !!currentUser
  const currentPlan = (subscription?.plan || currentUser?.plan || 'free') as UserPlan
  const currentRank = PLAN_RANK[currentPlan] ?? 0

  function getCta(planKey: UserPlan) {
    if (!isLoggedIn) {
      if (planKey === 'free') return 'Get Started'
      if (planKey === 'enterprise') return 'Contact Sales'
      return 'Start Free Trial'
    }

    const planRank = PLAN_RANK[planKey] ?? 0
    if (planRank === currentRank) return 'Current Plan'
    if (planKey === 'enterprise') return 'Contact Sales'
    if (planRank > currentRank) return 'Upgrade'
    return 'Downgrade'
  }

  function isDisabled(planKey: UserPlan) {
    if (!isLoggedIn) return false
    const planRank = PLAN_RANK[planKey] ?? 0
    return planRank === currentRank
  }

  function handleClick(planKey: UserPlan) {
    if (!isLoggedIn) return // Link handles navigation
    if (planKey === 'enterprise') {
      window.location.href = 'mailto:sales@llmcost.io?subject=Enterprise Plan Inquiry'
      return
    }
    if (planKey === 'free') return // Can't "buy" free

    const planRank = PLAN_RANK[planKey] ?? 0
    if (planRank > currentRank) {
      // Upgrade: create checkout
      const priceId = STRIPE_PRICES[planKey]
      if (priceId) createCheckout(priceId)
    } else if (planRank < currentRank) {
      // Downgrade: route to Stripe Customer Portal
      openPortal()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">LLM Cost Manager</Link>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button size="sm" variant="outline">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
                <Link href="/signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-gray-600">Start free. Upgrade as you grow.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const cta = getCta(plan.key)
            const disabled = isDisabled(plan.key)
            const isCurrent = isLoggedIn && cta === 'Current Plan'

            return (
              <Card key={plan.name} className={`${plan.popular ? 'ring-2 ring-blue-500' : ''} ${isCurrent ? 'bg-blue-50/50' : ''}`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    {plan.popular && <Badge variant="info">Popular</Badge>}
                    {isCurrent && <Badge variant="success">Current</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    {plan.price > 0 && <span className="text-gray-500">/month</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isLoggedIn ? (
                    <Button
                      variant={plan.popular && !disabled ? 'primary' : 'outline'}
                      className="mt-6 w-full"
                      disabled={disabled}
                      onClick={() => handleClick(plan.key)}
                    >
                      {cta}
                    </Button>
                  ) : (
                    <Link href={plan.key === 'enterprise' ? 'mailto:sales@llmcost.io' : '/signup'} className="mt-6 block">
                      <Button variant={plan.popular ? 'primary' : 'outline'} className="w-full">
                        {cta}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>

      <Footer />
    </div>
  )
}
