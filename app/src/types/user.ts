import type { SubscriptionStatus } from './billing'

export type UserPlan = 'free' | 'starter' | 'pro' | 'enterprise'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  plan: UserPlan
  stripeCustomerId?: string
  subscriptionId?: string
  subscriptionStatus?: SubscriptionStatus
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  trialEnd?: string
  createdAt: string
  updatedAt: string
}
