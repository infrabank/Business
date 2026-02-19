import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'

interface ObservabilityConfigRecord {
  id: string
  orgId: string
  provider: string
  enabled: boolean
  endpoint: string
  apiKey: string
  secretKey: string
  events: string[]
  createdAt: string
  updatedAt: string
}

export async function GET(req: NextRequest) {
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  }

  // Verify user has access to this organization
  try {
    const members = await bkend.get<Array<{ id: string }>>('/members', {
      params: { orgId, userId: authUser.id },
    })
    if (members.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const records = await bkend.get<ObservabilityConfigRecord[]>('/observability-configs', {
      params: { orgId },
    })

    if (records.length === 0) {
      return NextResponse.json(null)
    }

    const record = records[0]
    return NextResponse.json({
      provider: record.provider,
      enabled: record.enabled,
      endpoint: record.endpoint,
      apiKey: record.apiKey ? '••••' + record.apiKey.slice(-4) : '',
      secretKey: record.secretKey ? '••••' + record.secretKey.slice(-4) : '',
      events: record.events || [],
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await getMeServer()
    const body = await req.json()
    const { orgId, config } = body

    if (!orgId || !config) {
      return NextResponse.json({ error: 'orgId and config required' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Check if exists
    const existing = await bkend.get<ObservabilityConfigRecord[]>('/observability-configs', {
      params: { orgId },
    })

    let record: ObservabilityConfigRecord
    if (existing.length > 0) {
      // Update — only update apiKey/secretKey if not masked
      const updates: Record<string, unknown> = {
        provider: config.provider,
        enabled: config.enabled,
        endpoint: config.endpoint,
        events: config.events || [],
        updatedAt: now,
      }
      if (config.apiKey && !config.apiKey.startsWith('••••')) {
        updates.apiKey = config.apiKey
      }
      if (config.secretKey && !config.secretKey.startsWith('••••')) {
        updates.secretKey = config.secretKey
      }
      record = await bkend.patch<ObservabilityConfigRecord>(
        `/observability-configs/${existing[0].id}`,
        updates,
      )
    } else {
      // Create
      record = await bkend.post<ObservabilityConfigRecord>('/observability-configs', {
        orgId,
        provider: config.provider,
        enabled: config.enabled,
        endpoint: config.endpoint,
        apiKey: config.apiKey || '',
        secretKey: config.secretKey || '',
        events: config.events || [],
        createdAt: now,
        updatedAt: now,
      } as Record<string, unknown>)
    }

    return NextResponse.json({
      provider: record.provider,
      enabled: record.enabled,
      endpoint: record.endpoint,
      apiKey: record.apiKey ? '••••' + record.apiKey.slice(-4) : '',
      secretKey: record.secretKey ? '••••' + record.secretKey.slice(-4) : '',
      events: record.events || [],
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await getMeServer()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    const existing = await bkend.get<ObservabilityConfigRecord[]>('/observability-configs', {
      params: { orgId },
    })

    if (existing.length > 0) {
      await bkend.delete(`/observability-configs/${existing[0].id}`)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
