import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkendService } from '@/lib/bkend'
import type { ProxyLog } from '@/types/proxy'
import type { TimeseriesPoint } from '@/types/proxy-analytics'

/**
 * GET /api/proxy/analytics/timeseries?orgId=xxx&period=30d&groupBy=day
 * Returns time-series cost/savings data aggregated by day.
 */
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
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    const logs = await bkendService.get<ProxyLog[]>('/proxy-logs', {
      params: {
        orgId,
        createdAt_gte: startDate.toISOString(),
        _sort: 'createdAt',
        _limit: '10000',
      },
    })

    // Aggregate by date
    const map = new Map<string, TimeseriesPoint>()

    for (const log of logs) {
      const date = log.createdAt.slice(0, 10) // YYYY-MM-DD
      let point = map.get(date)
      if (!point) {
        point = { date, totalCost: 0, totalSaved: 0, requestCount: 0, cacheHits: 0, modelRoutings: 0 }
        map.set(date, point)
      }
      point.totalCost += Number(log.cost)
      point.totalSaved += Number(log.savedAmount)
      point.requestCount += 1
      if (log.cacheHit) point.cacheHits += 1
      if (log.originalModel) point.modelRoutings += 1
    }

    // Fill missing dates
    const result: TimeseriesPoint[] = []
    const cursor = new Date(startDate)
    const today = new Date()
    while (cursor <= today) {
      const dateStr = cursor.toISOString().slice(0, 10)
      const existing = map.get(dateStr)
      result.push(existing ?? {
        date: dateStr,
        totalCost: 0,
        totalSaved: 0,
        requestCount: 0,
        cacheHits: 0,
        modelRoutings: 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load analytics' },
      { status: 500 },
    )
  }
}
