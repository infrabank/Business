import Stripe from 'stripe'
import type { UserPlan } from '@/types'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      typescript: true,
    })
  }
  return _stripe
}


export const STRIPE_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
}

export function priceIdToPlan(priceId: string): UserPlan {
  if (priceId === STRIPE_PRICES.starter) return 'starter'
  if (priceId === STRIPE_PRICES.pro) return 'pro'
  if (priceId === STRIPE_PRICES.enterprise) return 'enterprise'
  return 'free'
}

export function planToPriceId(plan: UserPlan): string | null {
  if (plan === 'free') return null
  return STRIPE_PRICES[plan] ?? null
}
