import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend, bkendService } from '@/lib/bkend'
import type { BreakdownItem } from '@/types/proxy-analytics'

interface BreakdownRow {
  name: string
  total_cost: number
  total_saved: number
  request_count: number
  avg_latency_ms: number
  cache_hit_rate: number
}

interface ProxyLogSlim {
  providerType: string
  model: string
  proxyKeyId: string
  cost: number
  savedAmount: number
  latencyMs: number
  cacheHit: boolean
}

/**
 * GET /api/proxy/analytics/breakdown?orgId=xxx&period=30d&by=model
 * Returns cost breakdown by model, provider, or key.
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
  const by = req.nextUrl.searchParams.get('by') || 'model'
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    // Try DB-level aggregation via RPC (requires migration deployed)
    let result: BreakdownItem[] | null = null
    try {
      const rows = await bkendService.rpc<BreakdownRow[]>('proxy_logs_breakdown', {
        p_org_id: orgId,
        p_start_date: startDate.toISOString(),
        p_group_by: by,
      })
      result = rows.map((row) => ({
        name: row.name,
        totalCost: Math.round(row.total_cost * 10000) / 10000,
        totalSaved: Math.round(row.total_saved * 10000) / 10000,
        requestCount: Number(row.request_count),
        avgLatencyMs: Math.round(row.avg_latency_ms),
        cacheHitRate: Math.round(row.cache_hit_rate * 100) / 100,
      }))
    } catch {
      // RPC not available — fall back to JS aggregation
    }

    // Fallback: fetch only needed columns and aggregate in JS
    if (!result) {
      const logs = await bkendService.get<ProxyLogSlim[]>('/proxy-logs', {
        params: {
          orgId,
          createdAt_gte: startDate.toISOString(),
          _limit: '10000',
        },
      })

      const map = new Map<string, { cost: number; saved: number; count: number; latencySum: number; cacheHits: number }>()

      for (const log of logs) {
        const key = by === 'provider' ? log.providerType : by === 'key' ? log.proxyKeyId : log.model

        let entry = map.get(key)
        if (!entry) {
          entry = { cost: 0, saved: 0, count: 0, latencySum: 0, cacheHits: 0 }
          map.set(key, entry)
        }
        entry.cost += Number(log.cost)
        entry.saved += Number(log.savedAmount)
        entry.count += 1
        entry.latencySum += Number(log.latencyMs)
        if (log.cacheHit) entry.cacheHits += 1
      }

      result = Array.from(map.entries())
        .map(([name, v]) => ({
          name,
          totalCost: Math.round(v.cost * 10000) / 10000,
          totalSaved: Math.round(v.saved * 10000) / 10000,
          requestCount: v.count,
          avgLatencyMs: v.count > 0 ? Math.round(v.latencySum / v.count) : 0,
          cacheHitRate: v.count > 0 ? Math.round((v.cacheHits / v.count) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.totalCost - a.totalCost)
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load breakdown' },
      { status: 500 },
    )
  }
}
