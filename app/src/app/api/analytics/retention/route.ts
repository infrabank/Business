import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { AnalyticsEvent, RetentionCohort } from '@/types/analytics'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

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

  const weeks = parseInt(req.nextUrl.searchParams.get('weeks') || '8', 10)

  try {
    const now = new Date()
    const periodStart = new Date(now)
    periodStart.setDate(periodStart.getDate() - weeks * 7 - 7)

    // Get all page_view events in the period
    const events = await bkend.get<AnalyticsEvent[]>('/analytics-events', {
      params: {
        orgId,
        type: 'page_view',
        createdAt_gte: periodStart.toISOString(),
      },
    })

    // Group events by user and find each user's first event week
    const userFirstWeek = new Map<string, string>()
    const userActiveWeeks = new Map<string, Set<string>>()

    for (const e of events) {
      const eventDate = new Date(e.createdAt)
      const weekStart = getWeekStart(eventDate)

      // Track first week
      const existing = userFirstWeek.get(e.userId)
      if (!existing || weekStart < existing) {
        userFirstWeek.set(e.userId, weekStart)
      }

      // Track all active weeks
      if (!userActiveWeeks.has(e.userId)) {
        userActiveWeeks.set(e.userId, new Set())
      }
      userActiveWeeks.get(e.userId)!.add(weekStart)
    }

    // Build cohorts
    const cohortMap = new Map<string, Set<string>>()
    for (const [userId, firstWeek] of userFirstWeek) {
      if (!cohortMap.has(firstWeek)) {
        cohortMap.set(firstWeek, new Set())
      }
      cohortMap.get(firstWeek)!.add(userId)
    }

    // Sort cohort weeks and take the most recent N
    const sortedWeeks = Array.from(cohortMap.keys()).sort().slice(-weeks)

    // Generate all week starts in the range
    const allWeeks: string[] = []
    const startDate = new Date(sortedWeeks[0] || now.toISOString().split('T')[0])
    for (let i = 0; i < weeks + 8; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i * 7)
      allWeeks.push(d.toISOString().split('T')[0])
    }

    const cohorts: RetentionCohort[] = sortedWeeks.map((cohortWeek) => {
      const users = cohortMap.get(cohortWeek)!
      const cohortSize = users.size
      const retention: number[] = []

      // For each subsequent week, check how many users were active
      const cohortWeekIndex = allWeeks.indexOf(cohortWeek)
      const maxWeekOffset = Math.min(8, allWeeks.length - cohortWeekIndex)

      for (let w = 0; w < maxWeekOffset; w++) {
        const targetWeek = allWeeks[cohortWeekIndex + w]
        if (!targetWeek) break

        // Check if target week is in the future
        if (new Date(targetWeek) > now) break

        let activeCount = 0
        for (const userId of users) {
          const activeWeeks = userActiveWeeks.get(userId)
          if (activeWeeks?.has(targetWeek)) {
            activeCount++
          }
        }

        retention.push(cohortSize > 0 ? Math.round((activeCount / cohortSize) * 100) : 0)
      }

      return { cohortWeek, cohortSize, retention }
    })

    return NextResponse.json(cohorts)
  } catch (err) {
    console.error('[analytics/retention] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load retention data' },
      { status: 500 },
    )
  }
}
