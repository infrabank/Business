import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkendService } from '@/lib/bkend'
import type { ProxyLog } from '@/types/proxy'
import type { BreakdownItem } from '@/types/proxy-analytics'

/**
 * GET /api/proxy/analytics/breakdown?orgId=xxx&period=30d&by=model
 * Returns cost breakdown by model, provider, or key.
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
  const by = req.nextUrl.searchParams.get('by') || 'model'
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    const logs = await bkendService.get<ProxyLog[]>('/proxy-logs', {
      params: {
        orgId,
        createdAt_gte: startDate.toISOString(),
        _limit: '10000',
      },
    })

    // Group by dimension
    const map = new Map<string, { cost: number; saved: number; count: number; latencySum: number; cacheHits: number }>()

    for (const log of logs) {
      let key: string
      if (by === 'provider') {
        key = log.providerType
      } else if (by === 'key') {
        key = log.proxyKeyId
      } else {
        key = log.model
      }

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

    const result: BreakdownItem[] = Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        totalCost: Math.round(v.cost * 10000) / 10000,
        totalSaved: Math.round(v.saved * 10000) / 10000,
        requestCount: v.count,
        avgLatencyMs: v.count > 0 ? Math.round(v.latencySum / v.count) : 0,
        cacheHitRate: v.count > 0 ? Math.round((v.cacheHits / v.count) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load breakdown' },
      { status: 500 },
    )
  }
}
