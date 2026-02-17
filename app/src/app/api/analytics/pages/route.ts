import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { AnalyticsEvent, PageStat } from '@/types/analytics'

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
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10', 10)
  const days = getPeriodDays(period)

  try {
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - days)

    const events = await bkend.get<AnalyticsEvent[]>('/analytics-events', {
      params: {
        orgId,
        type: 'page_view',
        createdAt_gte: periodStart.toISOString(),
      },
    })

    // Group by page path (name)
    const pageMap = new Map<string, { views: number; users: Set<string>; totalDuration: number; durationCount: number }>()
    for (const e of events) {
      const entry = pageMap.get(e.name) || { views: 0, users: new Set(), totalDuration: 0, durationCount: 0 }
      entry.views++
      entry.users.add(e.userId)
      const duration = Number(e.metadata?.duration) || 0
      if (duration > 0) {
        entry.totalDuration += duration
        entry.durationCount++
      }
      pageMap.set(e.name, entry)
    }

    const pages: PageStat[] = Array.from(pageMap.entries())
      .map(([path, data]) => ({
        path,
        views: data.views,
        uniqueUsers: data.users.size,
        avgDuration: data.durationCount > 0 ? Math.round(data.totalDuration / data.durationCount) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)

    return NextResponse.json(pages)
  } catch (err) {
    console.error('[analytics/pages] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load page stats' },
      { status: 500 },
    )
  }
}
