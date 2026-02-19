import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { syncProviderUsage } from '@/services/usage-sync.service'
import { checkBudgetThresholds } from '@/services/budget.service'

export async function POST(req: NextRequest) {
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { orgId, providerId, fromDate, toDate } = body

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    // Verify user has access to this organization
    const members = await bkend.get<Array<{ id: string }>>('/members', {
      params: { orgId, userId: authUser.id },
    })
    if (members.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const syncResults = await syncProviderUsage({
      orgId,
      token: '',
      providerId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      syncType: 'manual',
    })

    const budgetAlerts = await checkBudgetThresholds(orgId, '')

    return NextResponse.json({
      sync: syncResults,
      alerts: budgetAlerts,
      syncedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 },
    )
  }
}
