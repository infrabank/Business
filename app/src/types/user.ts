import type { SubscriptionStatus } from './billing'

export type UserPlan = 'free' | 'growth'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  plan: UserPlan
  stripeCustomerId?: string
  subscriptionId?: string
  subscriptionItemId?: string
  subscriptionStatus?: SubscriptionStatus
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  createdAt: string
  updatedAt: string
}
