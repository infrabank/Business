import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { AnalyticsEvent, FunnelStep } from '@/types/analytics'

function getPeriodDays(period: string): number {
  if (period === '7d') return 7
  if (period === '90d') return 90
  return 30
}

interface UserRecord {
  id: string
  createdAt: string
}

export async function GET(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  const period = req.nextUrl.searchParams.get('period') || '90d'
  const days = getPeriodDays(period)

  try {
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - days)

    // Get members for this org to find users who signed up in period
    const members = await bkend.get<{ userId: string; createdAt: string }[]>('/members', {
      params: { orgId },
    })

    // Get users created in period
    const users = await bkend.get<UserRecord[]>('/users', {
      params: { orgId, createdAt_gte: periodStart.toISOString() },
    }).catch(() => [] as UserRecord[])

    const signupUserIds = new Set(
      users.length > 0
        ? users.map((u) => u.id)
        : members
            .filter((m) => new Date(m.createdAt) >= periodStart)
            .map((m) => m.userId),
    )
    const signupCount = signupUserIds.size || members.length

    // Get analytics events for funnel calculation
    const events = await bkend.get<AnalyticsEvent[]>('/analytics-events', {
      params: {
        orgId,
        createdAt_gte: periodStart.toISOString(),
      },
    })

    // Onboarding complete
    const onboardingComplete = new Set(
      events
        .filter((e) => e.type === 'onboarding_step' && e.name === 'complete')
        .map((e) => e.userId),
    )

    // Provider added
    const providerAdded = new Set(
      events
        .filter((e) => e.type === 'feature_use' && e.name === 'provider_add')
        .map((e) => e.userId),
    )

    // First sync
    const syncTriggered = new Set(
      events
        .filter((e) => e.type === 'feature_use' && e.name === 'sync_trigger')
        .map((e) => e.userId),
    )

    // 7-day retention: users who had page_view events 7+ days after their first event
    const userFirstEvent = new Map<string, number>()
    for (const e of events) {
      const t = new Date(e.createdAt).getTime()
      const existing = userFirstEvent.get(e.userId)
      if (!existing || t < existing) {
        userFirstEvent.set(e.userId, t)
      }
    }

    const retainedUsers = new Set<string>()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    for (const e of events) {
      const first = userFirstEvent.get(e.userId)
      if (first && new Date(e.createdAt).getTime() - first >= sevenDays) {
        retainedUsers.add(e.userId)
      }
    }

    const steps: FunnelStep[] = [
      { step: 'signup', label: '회원가입', count: signupCount, rate: 100, dropoff: 0 },
      {
        step: 'onboarding_complete',
        label: '온보딩 완료',
        count: onboardingComplete.size,
        rate: signupCount > 0 ? Math.round((onboardingComplete.size / signupCount) * 1000) / 10 : 0,
        dropoff: signupCount > 0 ? Math.round(((signupCount - onboardingComplete.size) / signupCount) * 1000) / 10 : 0,
      },
      {
        step: 'provider_add',
        label: '프로바이더 등록',
        count: providerAdded.size,
        rate: signupCount > 0 ? Math.round((providerAdded.size / signupCount) * 1000) / 10 : 0,
        dropoff: onboardingComplete.size > 0 ? Math.round(((onboardingComplete.size - providerAdded.size) / onboardingComplete.size) * 1000) / 10 : 0,
      },
      {
        step: 'first_sync',
        label: '첫 동기화',
        count: syncTriggered.size,
        rate: signupCount > 0 ? Math.round((syncTriggered.size / signupCount) * 1000) / 10 : 0,
        dropoff: providerAdded.size > 0 ? Math.round(((providerAdded.size - syncTriggered.size) / providerAdded.size) * 1000) / 10 : 0,
      },
      {
        step: 'retention_7d',
        label: '7일 리텐션',
        count: retainedUsers.size,
        rate: signupCount > 0 ? Math.round((retainedUsers.size / signupCount) * 1000) / 10 : 0,
        dropoff: syncTriggered.size > 0 ? Math.round(((syncTriggered.size - retainedUsers.size) / syncTriggered.size) * 1000) / 10 : 0,
      },
    ]

    return NextResponse.json(steps)
  } catch (err) {
    console.error('[analytics/funnel] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load funnel data' },
      { status: 500 },
    )
  }
}
