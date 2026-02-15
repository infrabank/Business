import { NextRequest, NextResponse } from 'next/server'
import { bkend } from '@/lib/bkend'
import type { UsageRecord } from '@/types'
import type { ChartDataPoint } from '@/types/dashboard'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  const period = req.nextUrl.searchParams.get('period') || '7d'
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    const days = period === '90d' ? 90 : period === '30d' ? 30 : 7
    const from = new Date()
    from.setDate(from.getDate() - days)

    const records = await bkend.get<UsageRecord[]>('/usage-records', {
      token,
      params: { orgId, date_gte: from.toISOString().split('T')[0] },
    })

    // Aggregate by date
    const dateMap = new Map<string, { cost: number; tokens: number; requests: number }>()
    for (const r of records) {
      const date = r.date.split('T')[0]
      const entry = dateMap.get(date) || { cost: 0, tokens: 0, requests: 0 }
      entry.cost += r.cost
      entry.tokens += r.totalTokens
      entry.requests += r.requestCount
      dateMap.set(date, entry)
    }

    const data: ChartDataPoint[] = Array.from(dateMap.entries())
      .map(([date, vals]) => ({
        date,
        cost: Math.round(vals.cost * 100) / 100,
        tokens: vals.tokens,
        requests: vals.requests,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load chart data' },
      { status: 500 },
    )
  }
}
