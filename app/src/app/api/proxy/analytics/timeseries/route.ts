import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend, bkendService } from '@/lib/bkend'
import type { TimeseriesPoint } from '@/types/proxy-analytics'

interface TimeseriesRow {
  date: string
  total_cost: number
  total_saved: number
  request_count: number
  cache_hits: number
  model_routings: number
}

interface ProxyLogSlim {
  createdAt: string
  cost: number
  savedAmount: number
  cacheHit: boolean
  originalModel: string | null
}

/**
 * GET /api/proxy/analytics/timeseries?orgId=xxx&period=30d
 * Returns time-series cost/savings data aggregated by day.
 * Uses DB-level aggregation via RPC with JS fallback.
 */
export async function GET(req: NextRequest) {
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  // Verify user has access to this organization
  try {
    const members = await bkend.get<Array<{ id: string }>>('/members', {
      params: { orgId, userId: authUser.id },
    })
    if (members.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const period = req.nextUrl.searchParams.get('period') || '30d'
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    // Try DB-level aggregation via RPC (requires migration deployed)
    let aggregated: Map<string, TimeseriesPoint> | null = null
    try {
      const rows = await bkendService.rpc<TimeseriesRow[]>('proxy_logs_timeseries', {
        p_org_id: orgId,
        p_start_date: startDate.toISOString(),
      })
      aggregated = new Map<string, TimeseriesPoint>()
      for (const row of rows) {
        aggregated.set(row.date, {
          date: row.date,
          totalCost: row.total_cost,
          totalSaved: row.total_saved,
          requestCount: Number(row.request_count),
          cacheHits: Number(row.cache_hits),
          modelRoutings: Number(row.model_routings),
        })
      }
    } catch {
      // RPC not available — fall back to JS aggregation with slim SELECT
    }

    // Fallback: fetch only needed columns and aggregate in JS
    if (!aggregated) {
      const logs = await bkendService.get<ProxyLogSlim[]>('/proxy-logs', {
        params: {
          orgId,
          createdAt_gte: startDate.toISOString(),
          _sort: 'createdAt',
          _limit: '10000',
        },
      })

      aggregated = new Map<string, TimeseriesPoint>()
      for (const log of logs) {
        const date = log.createdAt.slice(0, 10)
        let point = aggregated.get(date)
        if (!point) {
          point = { date, totalCost: 0, totalSaved: 0, requestCount: 0, cacheHits: 0, modelRoutings: 0 }
          aggregated.set(date, point)
        }
        point.totalCost += Number(log.cost)
        point.totalSaved += Number(log.savedAmount)
        point.requestCount += 1
        if (log.cacheHit) point.cacheHits += 1
        if (log.originalModel) point.modelRoutings += 1
      }
    }

    // Fill missing dates
    const result: TimeseriesPoint[] = []
    const cursor = new Date(startDate)
    const today = new Date()
    while (cursor <= today) {
      const dateStr = cursor.toISOString().slice(0, 10)
      const existing = aggregated.get(dateStr)
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
