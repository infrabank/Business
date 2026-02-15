import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'

const plans = [
  {
    name: 'Free',
    price: 0,
    description: 'For individuals getting started',
    features: ['1 provider', '1 API key', '7-day history', 'Basic dashboard'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Starter',
    price: 29,
    description: 'For small teams and projects',
    features: ['3 providers', '10 API keys', '30-day history', 'Budget alerts', 'CSV export'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Pro',
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
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
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
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">LLM Cost Manager</Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
            <Link href="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-gray-600">Start free. Upgrade as you grow.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  {plan.popular && <Badge variant="info">Popular</Badge>}
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
                <Link href="/signup" className="mt-6 block">
                  <Button variant={plan.popular ? 'primary' : 'outline'} className="w-full">
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
