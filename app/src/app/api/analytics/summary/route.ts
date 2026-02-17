import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { AnalyticsEvent, AnalyticsSummary, DailyUserCount } from '@/types/analytics'

function getPeriodDays(period: string): number {
  if (period === '7d') return 7
  if (period === '90d') return 90
  return 30
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
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
    const now = new Date()
    const periodStart = new Date(now)
    periodStart.setDate(periodStart.getDate() - days)

    const prevPeriodStart = new Date(periodStart)
    prevPeriodStart.setDate(prevPeriodStart.getDate() - days)

    // Fetch current period events
    const events = await bkend.get<AnalyticsEvent[]>('/analytics-events', {
      params: {
        orgId,
        createdAt_gte: periodStart.toISOString(),
        _sort: '-createdAt',
      },
    })

    // Fetch previous period events for comparison
    const prevEvents = await bkend.get<AnalyticsEvent[]>('/analytics-events', {
      params: {
        orgId,
        createdAt_gte: prevPeriodStart.toISOString(),
        createdAt_lte: periodStart.toISOString(),
      },
    })

    // DAU: distinct users today
    const today = formatDate(now)
    const todayEvents = events.filter((e) => e.createdAt.startsWith(today))
    const dau = new Set(todayEvents.map((e) => e.userId)).size

    // WAU: distinct users last 7 days
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekEvents = events.filter((e) => new Date(e.createdAt) >= weekAgo)
    const wau = new Set(weekEvents.map((e) => e.userId)).size

    // MAU: distinct users last 30 days
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthEvents = events.filter((e) => new Date(e.createdAt) >= monthAgo)
    const mau = new Set(monthEvents.map((e) => e.userId)).size

    // Previous period metrics for comparison
    const prevToday = new Date(now)
    prevToday.setDate(prevToday.getDate() - days)
    const prevTodayStr = formatDate(prevToday)
    const prevTodayEvents = prevEvents.filter((e) => e.createdAt.startsWith(prevTodayStr))
    const prevDau = new Set(prevTodayEvents.map((e) => e.userId)).size

    const prevWeekAgo = new Date(prevToday)
    prevWeekAgo.setDate(prevWeekAgo.getDate() - 7)
    const prevWeekEvents = prevEvents.filter((e) => new Date(e.createdAt) >= prevWeekAgo)
    const prevWau = new Set(prevWeekEvents.map((e) => e.userId)).size

    const prevMonthAgo = new Date(prevToday)
    prevMonthAgo.setDate(prevMonthAgo.getDate() - 30)
    const prevMonthEvents = prevEvents.filter((e) => new Date(e.createdAt) >= prevMonthAgo)
    const prevMau = new Set(prevMonthEvents.map((e) => e.userId)).size

    const dauChange = prevDau > 0 ? ((dau - prevDau) / prevDau) * 100 : 0
    const wauChange = prevWau > 0 ? ((wau - prevWau) / prevWau) * 100 : 0
    const mauChange = prevMau > 0 ? ((mau - prevMau) / prevMau) * 100 : 0

    // Average session duration
    const sessionStarts = events.filter((e) => e.type === 'session_start')
    const sessionEnds = events.filter((e) => e.type === 'session_end')
    let totalDuration = 0
    let sessionCount = 0
    for (const start of sessionStarts) {
      const end = sessionEnds.find((e) => e.sessionId === start.sessionId)
      if (end) {
        const duration = (new Date(end.createdAt).getTime() - new Date(start.createdAt).getTime()) / 1000
        if (duration > 0 && duration < 86400) {
          totalDuration += duration
          sessionCount++
        }
      }
    }
    const avgSessionDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0

    // Daily active users
    const dailyUsers: DailyUserCount[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = formatDate(d)
      const dayEvents = events.filter((e) => e.createdAt.startsWith(dateStr))
      dailyUsers.push({
        date: dateStr,
        count: new Set(dayEvents.map((e) => e.userId)).size,
      })
    }

    const summary: AnalyticsSummary = {
      dau,
      wau,
      mau,
      avgSessionDuration,
      totalEvents: events.length,
      dauChange: Math.round(dauChange * 10) / 10,
      wauChange: Math.round(wauChange * 10) / 10,
      mauChange: Math.round(mauChange * 10) / 10,
      dailyUsers,
    }

    return NextResponse.json(summary)
  } catch (err) {
    console.error('[analytics/summary] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load analytics summary' },
      { status: 500 },
    )
  }
}
