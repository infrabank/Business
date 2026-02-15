import type { UserPlan } from './user'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'

export interface SubscriptionInfo {
  plan: UserPlan
  status: SubscriptionStatus
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
  stripeCustomerId?: string
  subscriptionId?: string
}

export interface PaymentHistory {
  id: string
  orgId: string
  stripeInvoiceId: string
  amount: number
  currency: string
  status: 'paid' | 'failed' | 'pending'
  description: string
  paidAt?: string
  invoiceUrl?: string
  createdAt: string
}

export interface CheckoutRequest {
  priceId: string
  successUrl: string
  cancelUrl: string
}

export interface CheckoutResponse {
  url: string
}

export interface PortalResponse {
  url: string
}

export interface BillingStatus {
  subscription: SubscriptionInfo
  invoices: PaymentHistory[]
}

export interface PlanLimitCheck {
  allowed: boolean
  current: number
  limit: number
  planRequired?: UserPlan
}
