import { PLAN_LIMITS } from './constants'
import type { UserPlan } from '@/types'
import type { PlanLimitCheck } from '@/types/billing'

export function checkProviderLimit(plan: UserPlan, currentCount: number): PlanLimitCheck {
  const limit = PLAN_LIMITS[plan].providers
  if (limit === -1) return { allowed: true, current: currentCount, limit: -1 }
  const allowed = currentCount < limit
  return {
    allowed,
    current: currentCount,
    limit,
    planRequired: allowed ? undefined : getNextPlan(plan),
  }
}

export function checkHistoryLimit(plan: UserPlan): { maxDays: number } {
  const maxDays = PLAN_LIMITS[plan].historyDays
  return { maxDays: maxDays === -1 ? 365 : maxDays }
}

export function checkMemberLimit(plan: UserPlan, currentCount: number): PlanLimitCheck {
  const limit = PLAN_LIMITS[plan].members
  if (limit === -1) return { allowed: true, current: currentCount, limit: -1 }
  const allowed = currentCount < limit
  return {
    allowed,
    current: currentCount,
    limit,
    planRequired: allowed ? undefined : getNextPlan(plan),
  }
}

export function isFeatureAvailable(
  plan: UserPlan,
  feature: 'optimization' | 'analytics' | 'export' | 'team' | 'budget_alerts'
): boolean {
  const featureAccess: Record<string, UserPlan[]> = {
    budget_alerts: ['starter', 'pro', 'enterprise'],
    export: ['starter', 'pro', 'enterprise'],
    team: ['starter', 'pro', 'enterprise'],
    analytics: ['pro', 'enterprise'],
    optimization: ['pro', 'enterprise'],
  }
  return featureAccess[feature]?.includes(plan) ?? false
}

function getNextPlan(plan: UserPlan): UserPlan {
  const upgrade: Record<UserPlan, UserPlan> = {
    free: 'starter',
    starter: 'pro',
    pro: 'enterprise',
    enterprise: 'enterprise',
  }
  return upgrade[plan]
}
