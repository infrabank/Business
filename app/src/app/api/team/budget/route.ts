import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'

export async function GET() {
  try {
    const user = await getMeServer()
    const orgs = await bkend.get<{ id: string; teamBudgetLimit?: number; teamBudgetDuration?: string }[]>(
      '/organizations',
      { params: { ownerId: user.id } },
    )
    if (orgs.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    const org = orgs[0]
    return NextResponse.json({
      teamBudgetLimit: org.teamBudgetLimit ?? null,
      teamBudgetDuration: org.teamBudgetDuration ?? 'monthly',
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getMeServer()
    const body = await request.json()

    const orgs = await bkend.get<{ id: string }[]>(
      '/organizations',
      { params: { ownerId: user.id } },
    )
    if (orgs.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (body.teamBudgetLimit !== undefined) {
      updates.teamBudgetLimit = body.teamBudgetLimit
    }
    if (body.teamBudgetDuration !== undefined) {
      if (!['daily', 'weekly', 'monthly'].includes(body.teamBudgetDuration)) {
        return NextResponse.json({ error: 'Invalid budget duration' }, { status: 400 })
      }
      updates.teamBudgetDuration = body.teamBudgetDuration
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const updated = await bkend.patch(`/organizations/${orgs[0].id}`, updates)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
