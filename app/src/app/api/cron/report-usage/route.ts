import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { STRIPE_METER_EVENT_NAME } from '@/lib/constants'
import { bkendService as bkend } from '@/lib/bkend'

interface GrowthUser {
  id: string
  stripeCustomerId: string
  subscriptionItemId: string
  plan: string
}

interface Organization {
  id: string
  ownerId: string
}

interface ProxyLog {
  id: string
  savedAmount?: number
}

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel Cron sets this header)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all growth-plan users with subscriptionItemId
    const users = await bkend.get<GrowthUser[]>('/users', {
      params: { plan: 'growth' },
    })

    const growthUsers = users.filter((u) => u.stripeCustomerId)

    // Calculate previous month range
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const results: { userId: string; savings: number; reported: boolean }[] = []

    for (const user of growthUsers) {
      try {
        // Find user's org
        const orgs = await bkend.get<Organization[]>('/organizations', {
          params: { ownerId: user.id },
        })
        if (orgs.length === 0) {
          results.push({ userId: user.id, savings: 0, reported: false })
          continue
        }

        // Sum savedAmount from proxy_logs for previous month
        const logs = await bkend.get<ProxyLog[]>('/proxy-logs', {
          params: {
            orgId: orgs[0].id,
            createdAt_gte: periodStart.toISOString(),
            createdAt_lte: periodEnd.toISOString(),
          },
        })

        const totalSavings = logs.reduce((sum, l) => sum + (l.savedAmount || 0), 0)

        if (totalSavings > 0) {
          // Report usage to Stripe via Billing Meter Events
          // 1 unit = $1 of savings → price $0.20/unit = 20% commission
          const quantity = Math.ceil(totalSavings)
          await getStripe().billing.meterEvents.create({
            event_name: STRIPE_METER_EVENT_NAME,
            payload: {
              stripe_customer_id: user.stripeCustomerId,
              value: String(quantity),
            },
            timestamp: Math.floor(periodEnd.getTime() / 1000),
          })

          // Log to commission_reports for audit
          await bkend.post('/commission-reports', {
            userId: user.id,
            orgId: orgs[0].id,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            totalSavings: Math.round(totalSavings * 100) / 100,
            commissionAmount: Math.round(totalSavings * 0.20 * 100) / 100,
            stripeUsageQuantity: quantity,
            reportedAt: new Date().toISOString(),
          })

          results.push({ userId: user.id, savings: totalSavings, reported: true })
        } else {
          results.push({ userId: user.id, savings: 0, reported: false })
        }
      } catch (err) {
        console.error(`[report-usage] Error for user ${user.id}:`, err)
        results.push({ userId: user.id, savings: 0, reported: false })
      }
    }

    return NextResponse.json({
      success: true,
      period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
      processed: results.length,
      reported: results.filter((r) => r.reported).length,
      totalSavings: results.reduce((s, r) => s + r.savings, 0),
    })
  } catch (error) {
    console.error('[report-usage] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Usage report failed' },
      { status: 500 }
    )
  }
}
