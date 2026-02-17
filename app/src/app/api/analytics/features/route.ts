import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { AnalyticsEvent, FeatureStat } from '@/types/analytics'

function getPeriodDays(period: string): number {
  if (period === '7d') return 7
  if (period === '90d') return 90
  return 30
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

  const period = req.nextUrl.searchParams.get('period') || '30d'
  const days = getPeriodDays(period)

  try {
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - days)

    const events = await bkend.get<AnalyticsEvent[]>('/analytics-events', {
      params: {
        orgId,
        type: 'feature_use',
        createdAt_gte: periodStart.toISOString(),
      },
    })

    // Group by feature name
    const featureMap = new Map<string, { count: number; users: Set<string> }>()
    for (const e of events) {
      const entry = featureMap.get(e.name) || { count: 0, users: new Set() }
      entry.count++
      entry.users.add(e.userId)
      featureMap.set(e.name, entry)
    }

    const features: FeatureStat[] = Array.from(featureMap.entries())
      .map(([name, data]) => ({
        name,
        usageCount: data.count,
        uniqueUsers: data.users.size,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)

    return NextResponse.json(features)
  } catch (err) {
    console.error('[analytics/features] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load feature stats' },
      { status: 500 },
    )
  }
}
