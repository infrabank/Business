export type UserPlan = 'free' | 'starter' | 'pro' | 'enterprise'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  plan: UserPlan
  createdAt: string
  updatedAt: string
}
