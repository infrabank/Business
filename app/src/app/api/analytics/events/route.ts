import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { AnalyticsEventType } from '@/types/analytics'

const VALID_TYPES: AnalyticsEventType[] = [
  'page_view', 'feature_use', 'button_click',
  'onboarding_step', 'session_start', 'session_end',
]

const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100
const WINDOW_MS = 60_000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { events, sessionId } = body

    if (!Array.isArray(events) || !sessionId) {
      return NextResponse.json({ error: 'Invalid payload: events array and sessionId required' }, { status: 400 })
    }

    if (events.length > 50) {
      return NextResponse.json({ error: 'Batch limit: max 50 events' }, { status: 400 })
    }

    const errors: string[] = []
    const validEvents = events.filter((e: { type?: string; name?: string }, i: number) => {
      if (!e.type || !VALID_TYPES.includes(e.type as AnalyticsEventType)) {
        errors.push(`Event[${i}]: invalid type "${e.type}"`)
        return false
      }
      if (!e.name) {
        errors.push(`Event[${i}]: name is required`)
        return false
      }
      return true
    })

    if (validEvents.length === 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
    }

    // Look up user's orgId
    const userRecord = await bkend.get<{ orgId: string }[]>('/members', {
      params: { userId: user.id, _limit: '1' },
    })
    const orgId = userRecord[0]?.orgId
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Insert events
    const now = new Date().toISOString()
    for (const event of validEvents) {
      await bkend.post('/analytics-events', {
        orgId,
        userId: user.id,
        type: event.type,
        name: event.name,
        metadata: event.metadata || {},
        sessionId,
        createdAt: event.metadata?.timestamp || now,
      })
    }

    return NextResponse.json({ received: validEvents.length }, { status: 201 })
  } catch (err) {
    console.error('[analytics/events] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process events' },
      { status: 500 },
    )
  }
}
