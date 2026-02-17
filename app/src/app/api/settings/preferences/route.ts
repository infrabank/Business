import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { getPreferences, updatePreferences } from '@/services/settings.service'

const VALID_CURRENCIES = ['USD', 'KRW', 'EUR', 'JPY']
const VALID_DATE_FORMATS = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']
const VALID_NUMBER_FORMATS = ['1,000.00', '1.000,00']
const VALID_PERIODS = [7, 30, 90]

export async function GET() {
  try {
    const user = await getMeServer()
    const prefs = await getPreferences(user.id)
    return NextResponse.json(prefs)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load preferences'
    if (message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getMeServer()
    const body = await request.json()

    // Validate fields
    const updates: Record<string, unknown> = {}

    if (body.currency !== undefined) {
      if (!VALID_CURRENCIES.includes(body.currency)) {
        return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
      }
      updates.currency = body.currency
    }

    if (body.dateFormat !== undefined) {
      if (!VALID_DATE_FORMATS.includes(body.dateFormat)) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      updates.dateFormat = body.dateFormat
    }

    if (body.numberFormat !== undefined) {
      if (!VALID_NUMBER_FORMATS.includes(body.numberFormat)) {
        return NextResponse.json({ error: 'Invalid number format' }, { status: 400 })
      }
      updates.numberFormat = body.numberFormat
    }

    if (body.dashboardPeriod !== undefined) {
      if (!VALID_PERIODS.includes(body.dashboardPeriod)) {
        return NextResponse.json({ error: 'Invalid dashboard period' }, { status: 400 })
      }
      updates.dashboardPeriod = body.dashboardPeriod
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const prefs = await getPreferences(user.id)
    const updated = await updatePreferences(prefs.id, updates)
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update preferences'
    if (message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
