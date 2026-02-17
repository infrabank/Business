import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { checkHistoryLimit } from '@/lib/plan-limits'
import { getMonthlyReports } from '@/services/report.service'
import type { User, UserPlan } from '@/types'

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

  try {
    const user = await bkend.get<User>(`/users/${authUser.id}`)
    const rawPlan = user.plan || 'free'
    const plan: UserPlan = rawPlan === 'free' ? 'free' : 'growth'

    // Free: 1 month, Growth: 12 months
    const maxMonths = plan === 'growth' ? 12 : 1

    const token = ''
    const reports = await getMonthlyReports(orgId, token, maxMonths)
    return NextResponse.json(reports)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load reports' },
      { status: 500 },
    )
  }
}
