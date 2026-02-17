import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { checkHistoryLimit, isFeatureAvailable } from '@/lib/plan-limits'
import { getReportSummary } from '@/services/report.service'
import type { User, UserPlan } from '@/types'

export async function GET(req: NextRequest) {
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  if (!orgId || !from || !to) {
    return NextResponse.json({ error: 'orgId, from, to are required' }, { status: 400 })
  }

  try {
    const user = await bkend.get<User>(`/users/${authUser.id}`)
    const rawPlan = user.plan || 'free'
    const plan: UserPlan = rawPlan === 'free' ? 'free' : 'growth'
    const { maxDays } = checkHistoryLimit(plan)

    // Validate date range against plan limits
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    if (daysDiff > maxDays) {
      return NextResponse.json(
        { error: `Your plan allows up to ${maxDays} days. Upgrade for more.`, planRequired: 'growth' },
        { status: 403 },
      )
    }

    const token = ''
    const summary = await getReportSummary(orgId, from, to, token)

    // Free plan: overview only, no breakdown
    if (!isFeatureAvailable(plan, 'export')) {
      return NextResponse.json({
        ...summary,
        byProvider: [],
        byModel: [],
        byProject: [],
        dailyTrend: [],
        planGated: true,
      })
    }

    return NextResponse.json(summary)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load summary' },
      { status: 500 },
    )
  }
}
