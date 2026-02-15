import { NextRequest, NextResponse } from 'next/server'
import { syncAllProviders } from '@/services/usage-sync.service'
import { checkBudgetThresholds } from '@/services/budget.service'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { orgId } = await req.json()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const syncResults = await syncAllProviders(orgId, token)
    const budgetAlerts = await checkBudgetThresholds(orgId, token)

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
