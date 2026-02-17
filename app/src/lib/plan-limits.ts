import { PLAN_LIMITS } from './constants'
import type { UserPlan } from '@/types'
import type { PlanLimitCheck } from '@/types/billing'

type PlanLimits = (typeof PLAN_LIMITS)[UserPlan]

function isUnlimited(value: number): boolean {
  return value === -1
}

export function checkProviderLimit(plan: UserPlan, currentCount: number): PlanLimitCheck {
  const limit = PLAN_LIMITS[plan].providers as number
  if (isUnlimited(limit)) return { allowed: true, current: currentCount, limit: -1 }
  const allowed = currentCount < limit
  return {
    allowed,
    current: currentCount,
    limit,
    planRequired: allowed ? undefined : 'growth',
  }
}

export function checkHistoryLimit(plan: UserPlan): { maxDays: number } {
  const maxDays = PLAN_LIMITS[plan].historyDays as number
  return { maxDays: isUnlimited(maxDays) ? 365 : maxDays }
}

export function checkMemberLimit(plan: UserPlan, currentCount: number): PlanLimitCheck {
  const limit = PLAN_LIMITS[plan].members as number
  if (isUnlimited(limit)) return { allowed: true, current: currentCount, limit: -1 }
  const allowed = currentCount < limit
  return {
    allowed,
    current: currentCount,
    limit,
    planRequired: allowed ? undefined : 'growth',
  }
}

export function checkRequestLimit(plan: UserPlan, currentCount: number): PlanLimitCheck {
  const limit = PLAN_LIMITS[plan].maxRequests as number
  if (isUnlimited(limit)) return { allowed: true, current: currentCount, limit: -1 }
  const allowed = currentCount < limit
  return {
    allowed,
    current: currentCount,
    limit,
    planRequired: allowed ? undefined : 'growth',
  }
}

export function checkPlaygroundLimit(plan: UserPlan, todayCount: number): PlanLimitCheck {
  const limit = PLAN_LIMITS[plan].playgroundDaily as number
  if (isUnlimited(limit)) return { allowed: true, current: todayCount, limit: -1 }
  const allowed = todayCount < limit
  return {
    allowed,
    current: todayCount,
    limit,
    planRequired: allowed ? undefined : 'growth',
  }
}

export function checkTemplateLimit(plan: UserPlan, currentCount: number): PlanLimitCheck {
  const limit = PLAN_LIMITS[plan].maxTemplates as number
  if (isUnlimited(limit)) return { allowed: true, current: currentCount, limit: -1 }
  const allowed = currentCount < limit
  return {
    allowed,
    current: currentCount,
    limit,
    planRequired: allowed ? undefined : 'growth',
  }
}

export function isFeatureAvailable(
  plan: UserPlan,
  feature: 'optimization' | 'analytics' | 'export' | 'team' | 'budget_alerts' | 'anomaly_detection' | 'notifications'
): boolean {
  if (plan === 'growth') return true
  return false
}

export function getNextPlan(plan: UserPlan): UserPlan {
  if (plan === 'free') return 'growth'
  return 'growth'
}
