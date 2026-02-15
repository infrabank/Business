import { NextRequest, NextResponse } from 'next/server'
import { bkend } from '@/lib/bkend'
import { getMe } from '@/lib/auth'
import { checkHistoryLimit } from '@/lib/plan-limits'
import type { UsageRecord, User, UserPlan } from '@/types'
import type { ChartDataPoint } from '@/types/dashboard'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  const period = req.nextUrl.searchParams.get('period') || '7d'
  const comparison = req.nextUrl.searchParams.get('comparison') === 'true'
  const providerTypesParam = req.nextUrl.searchParams.get('providerTypes')
  const providerFilter = providerTypesParam ? providerTypesParam.split(',') : null

  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    // Enforce plan history limit
    const authUser = await getMe(token)
    const user = await bkend.get<User>(`/users/${authUser.id}`, { token })
    const { maxDays } = checkHistoryLimit((user.plan || 'free') as UserPlan)

    const requestedDays = period === '90d' ? 90 : period === '30d' ? 30 : 7
    const days = Math.min(requestedDays, maxDays)
    const from = new Date()
    from.setDate(from.getDate() - days)

    const records = await bkend.get<UsageRecord[]>('/usage-records', {
      token,
      params: { orgId, date_gte: from.toISOString().split('T')[0] },
    })

    // Apply provider filter
    const filteredRecords = providerFilter
      ? records.filter((r) => providerFilter.includes(r.providerType))
      : records

    // Aggregate by date
    const dateMap = new Map<string, { cost: number; tokens: number; requests: number }>()
    for (const r of filteredRecords) {
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

    // Comparison data: fetch previous period
    if (comparison) {
      const prevFrom = new Date(from)
      prevFrom.setDate(prevFrom.getDate() - days)

      const prevRecords = await bkend.get<UsageRecord[]>('/usage-records', {
        token,
        params: {
          orgId,
          date_gte: prevFrom.toISOString().split('T')[0],
          date_lte: from.toISOString().split('T')[0],
        },
      })

      const filteredPrevRecords = providerFilter
        ? prevRecords.filter((r) => providerFilter.includes(r.providerType))
        : prevRecords

      // Aggregate previous period by date
      const prevDateMap = new Map<string, number>()
      for (const r of filteredPrevRecords) {
        const date = r.date.split('T')[0]
        prevDateMap.set(date, (prevDateMap.get(date) || 0) + r.cost)
      }

      // Sort previous dates and align with current period by index
      const prevDates = Array.from(prevDateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))

      data.forEach((point, i) => {
        point.previousCost = prevDates[i]
          ? Math.round(prevDates[i][1] * 100) / 100
          : undefined
      })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load chart data' },
      { status: 500 },
    )
  }
}
