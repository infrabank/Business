'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Check, ArrowRight, Calculator, Zap, Shield, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { useAppStore } from '@/lib/store'
import { useBilling } from '@/features/billing/hooks/useBilling'
import type { UserPlan } from '@/types'

function SavingsCalculator() {
  const [monthlySpend, setMonthlySpend] = useState(5000)
  const savingsRate = 0.42 // average 42% savings
  const commissionRate = 0.20

  const estimatedSavings = monthlySpend * savingsRate
  const commission = estimatedSavings * commissionRate
  const netSavings = estimatedSavings - commission
  const actualCost = monthlySpend - estimatedSavings

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg lg:p-8">
      <div className="mb-6 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-gray-900">Savings Calculator</h3>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Monthly LLM Spend: <span className="text-emerald-600 font-bold">${monthlySpend.toLocaleString()}</span>
        </label>
        <input
          type="range"
          min={500}
          max={50000}
          step={500}
          value={monthlySpend}
          onChange={(e) => setMonthlySpend(Number(e.target.value))}
          className="w-full accent-emerald-600"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>$500</span>
          <span>$50,000</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-4 text-center">
          <p className="text-xs font-medium text-gray-500">Without LCM</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">${monthlySpend.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-4 text-center">
          <p className="text-xs font-medium text-emerald-600">Estimated Savings</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">${Math.round(estimatedSavings).toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4 text-center">
          <p className="text-xs font-medium text-blue-600">Our Commission (20%)</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">${Math.round(commission).toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-emerald-100 p-4 text-center">
          <p className="text-xs font-medium text-emerald-700">Your Net Savings</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">${Math.round(netSavings).toLocaleString()}</p>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        You pay <span className="font-semibold text-gray-900">${Math.round(actualCost + commission).toLocaleString()}/mo</span> instead
        of ${monthlySpend.toLocaleString()}/mo — saving <span className="font-semibold text-emerald-600">{Math.round((netSavings / monthlySpend) * 100)}%</span> net
      </p>
    </div>
  )
}

const faqItems = [
  {
    question: 'How does the commission model work?',
    answer: 'We only charge when we save you money. Our proxy optimizes your LLM costs through caching and smart model routing. At the end of each month, we calculate your total savings and charge 20% of that amount. If we save you nothing, you pay nothing.',
  },
  {
    question: 'When am I billed?',
    answer: 'Commission is calculated and billed monthly via Stripe. On the 1st of each month, we tally the previous month\'s savings from your proxy logs and report usage to Stripe. You\'ll receive an invoice for 20% of the total savings.',
  },
  {
    question: 'What counts as "savings"?',
    answer: 'Savings = what you would have paid without LCM minus what you actually paid. This includes savings from response caching (duplicate requests cost $0) and smart model routing (simple queries auto-routed to cheaper models).',
  },
  {
    question: 'What are the Free tier limits?',
    answer: 'Free tier includes 1,000 requests/month, 1 provider, and 7-day history. Upgrade to Growth for unlimited requests, all providers, and 365-day history.',
  },
  {
    question: 'Can I downgrade back to Free?',
    answer: 'Yes, you can cancel your Growth plan anytime through the billing portal. You\'ll revert to Free tier limits at the end of your current billing period.',
  },
]

export default function PricingPage() {
  const currentUser = useAppStore((s) => s.currentUser)
  const { subscription, createCheckout, openPortal } = useBilling()
  const isLoggedIn = !!currentUser
  const currentPlan = (subscription?.plan || currentUser?.plan || 'free') as UserPlan

  function handleUpgrade() {
    if (!isLoggedIn) return
    createCheckout()
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

      <main className="mx-auto max-w-5xl px-4 py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Only pay when we save you money</h1>
          <p className="mt-4 text-lg text-gray-600">
            No monthly fees. We take 20% of what we save you — if we save you nothing, it costs you nothing.
          </p>
        </div>

        {/* Two-tier cards */}
        <div className="mx-auto mb-16 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
          {/* Free */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Free</h3>
              <p className="mt-1 text-sm text-gray-500">Try it out, no commitment</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500">/forever</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {['1,000 requests/month', '1 provider', '7-day history', 'Basic dashboard', 'Response caching', 'Smart routing'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" /> {f}
                  </li>
                ))}
              </ul>
              {isLoggedIn ? (
                <Button
                  variant="outline"
                  className="mt-6 w-full"
                  disabled={currentPlan === 'free'}
                >
                  {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
                </Button>
              ) : (
                <Link href="/signup" className="mt-6 block">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Growth */}
          <Card className="ring-2 ring-emerald-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Growth</h3>
                <Badge variant="success">Recommended</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">Pay only for results</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-emerald-600">20%</span>
                <span className="text-gray-500"> of savings</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">$0 base — commission only</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  'Unlimited requests',
                  'All providers (OpenAI, Anthropic, Google)',
                  '365-day history',
                  'Advanced analytics',
                  'Budget alerts & guardrails',
                  'Team members',
                  'Optimization recommendations',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              {isLoggedIn ? (
                currentPlan === 'growth' ? (
                  <Button variant="outline" className="mt-6 w-full" onClick={openPortal}>
                    Manage Subscription
                  </Button>
                ) : (
                  <Button variant="primary" className="mt-6 w-full" onClick={handleUpgrade}>
                    Start Saving <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )
              ) : (
                <Link href="/signup" className="mt-6 block">
                  <Button variant="primary" className="w-full">
                    Start Saving <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Savings Calculator */}
        <div className="mb-16">
          <SavingsCalculator />
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">How commission billing works</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: Zap, title: 'We optimize your requests', desc: 'Caching, smart routing, and budget guardrails reduce your LLM costs automatically.' },
              { icon: BarChart3, title: 'Savings tracked per-request', desc: 'Every proxy request logs original cost vs actual cost. Your dashboard shows real-time savings.' },
              { icon: Shield, title: 'Monthly commission invoice', desc: 'On the 1st of each month, Stripe charges 20% of previous month\'s total savings. No savings = no charge.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <Icon className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <div className="mx-auto max-w-3xl space-y-4">
            {faqItems.map(({ question, answer }) => (
              <details key={question} className="group rounded-lg border border-gray-200 bg-white">
                <summary className="cursor-pointer px-6 py-4 font-medium text-gray-900">
                  {question}
                </summary>
                <p className="px-6 pb-4 text-sm text-gray-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
