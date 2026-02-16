import Stripe from 'stripe'
import { STRIPE_METERED_PRICE } from './constants'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      typescript: true,
    })
  }
  return _stripe
}

export { STRIPE_METERED_PRICE }
